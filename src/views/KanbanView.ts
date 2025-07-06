import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import ProjectManagerPlugin from '../../main';
import { KanbanColumn, KanbanTask, Task, TaskStatus } from '../types';
import { ErrorHandler, FileOperationError } from '../utils/ErrorHandler';

export const KANBAN_VIEW_TYPE = "kanban-view";

export interface KanbanBoard {
	id: string;
	name: string;
	columns: KanbanColumn[];
	projectId?: string;
}

export class KanbanView extends ItemView {
	plugin: ProjectManagerPlugin;
	private kanbanBoard: KanbanBoard | null = null;
	private isDragging = false;
	private draggedTask: KanbanTask | null = null;
	private readonly errorHandler = ErrorHandler.getInstance();

	constructor(leaf: WorkspaceLeaf, plugin: ProjectManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return KANBAN_VIEW_TYPE;
	}

	getDisplayText() {
		return "Kanban Board";
	}

	getIcon() {
		return "columns";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('kanban-container');

		// Create header
		const header = container.createDiv('kanban-header');
		header.createEl('h2', { text: 'Kanban Board' });

		// Create controls
		const controls = header.createDiv('kanban-controls');
		const refreshBtn = controls.createEl('button', { text: 'Refresh' });
		const projectSelect = controls.createEl('select');
		const newTaskBtn = controls.createEl('button', { text: 'New Task' });

		// Event listeners
		refreshBtn.addEventListener('click', () => this.refreshBoard());
		newTaskBtn.addEventListener('click', () => this.createNewTask());
		projectSelect.addEventListener('change', (e) => this.onProjectChange(e));

		// Load projects for filter
		await this.loadProjectsToSelect(projectSelect);

		// Create board container
		const boardContainer = container.createDiv('kanban-board-container');

		// Initialize and render board
		await this.initializeBoard();
		await this.renderBoard(boardContainer);
	}

	async onClose() {
		// Clean up event listeners and resources
		this.kanbanBoard = null;
		this.draggedTask = null;
	}

	private async loadProjectsToSelect(selectElement: HTMLSelectElement): Promise<void> {
		try {
			// Add "All Projects" option
			selectElement.createEl('option', { value: '', text: 'All Projects' });

			// Load all projects
			const projects = await this.plugin.projectManager.getAllProjects();
			projects.forEach(project => {
				selectElement.createEl('option', {
					value: project.id,
					text: project.name
				});
			});
		} catch (error) {
			console.error('Failed to load projects:', error);
			this.errorHandler.handle(new FileOperationError('Failed to load projects', undefined, 'load'));
			// Continue with empty selection
		}
	}

	private async onProjectChange(event: Event): Promise<void> {
		const select = event.target as HTMLSelectElement;
		const projectId = select.value;

		// Filter tasks by project
		await this.initializeBoard(projectId || undefined);
		const boardContainer = this.containerEl.querySelector('.kanban-board-container') as HTMLElement;
		if (boardContainer) {
			boardContainer.empty();
			await this.renderBoard(boardContainer);
		}
	}

	private async initializeBoard(projectId?: string): Promise<void> {
		try {
			// Define default columns
			const defaultColumns: KanbanColumn[] = [
				{ id: 'todo', title: 'To Do', tasks: [] },
				{ id: 'in-progress', title: 'In Progress', tasks: [] },
				{ id: 'review', title: 'Review', tasks: [] },
				{ id: 'done', title: 'Done', tasks: [] }
			];

			// Load tasks from files
			const tasks = await this.loadTasks(projectId);

			// Distribute tasks into columns based on status
			for (const task of tasks) {
				const kanbanTask: KanbanTask = {
					id: task.id,
					title: task.title,
					description: task.description,
					priority: task.priority,
					assignee: task.assignee,
					dueDate: task.dueDate,
					tags: task.tags,
					estimatedHours: task.estimatedHours
				};

				// Determine column based on task status
				let columnId = 'todo';
				switch (task.status.toLowerCase()) {
					case 'in progress':
					case 'in-progress':
						columnId = 'in-progress';
						break;
					case 'review':
					case 'testing':
						columnId = 'review';
						break;
					case 'done':
					case 'completed':
						columnId = 'done';
						break;
				}

				const column = defaultColumns.find(col => col.id === columnId);
				if (column) {
					column.tasks.push(kanbanTask);
				}
			}

			this.kanbanBoard = {
				id: projectId ?? 'all-projects',
				name: projectId ? 'Project Board' : 'All Projects Board',
				columns: defaultColumns,
				projectId
			};
		} catch (error) {
			this.errorHandler.handle(error as Error, { projectId });
		}
	}

	private async loadTasks(projectId?: string): Promise<Task[]> {
		try {
			const allFiles = this.app.vault.getMarkdownFiles();
			const tasks: Task[] = [];

			for (const file of allFiles) {
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.frontmatter) {
					const fm = cache.frontmatter;

					// Check if it's a task and matches project filter
					if (fm.type === 'task' || file.path.includes('task') || file.path.includes('Task')) {
						if (!projectId || fm.parentProject === projectId || fm.project === projectId) {
							tasks.push({
								id: file.path,
								title: fm.title ?? file.basename,
								description: fm.description ?? '',
								status: fm.status ?? 'To Do',
								priority: fm.priority ?? 'medium',
								assignee: fm.assignee,
								dueDate: fm.dueDate,
								tags: fm.tags ?? [],
								estimatedHours: fm.estimatedHours,
								actualHours: fm.actualHours,
								progress: fm.progress ?? 0,
								parentProject: fm.parentProject ?? fm.project ?? '',
								dependencies: fm.dependencies ?? [],
								subtasks: [],
								comments: [],
								created: fm.created ?? file.stat.ctime.toString(),
								updated: fm.updated ?? new Date().toISOString(),
								file
							});
						}
					}
				}
			}

			return tasks;
		} catch (error) {
			console.error('Failed to load tasks:', error);
			this.errorHandler.handle(new FileOperationError('Failed to load tasks', undefined, 'load'));
			return [];
		}
	}

	private async renderBoard(container: HTMLElement): Promise<void> {
		if (!this.kanbanBoard) {
			container.createEl('p', { text: 'No board data available' });
			return;
		}

		const board = container.createDiv('kanban-board');

		for (const column of this.kanbanBoard.columns) {
			const columnEl = this.renderColumn(board, column);
			this.setupDropZone(columnEl, column.id);
		}
	}

	private renderColumn(container: HTMLElement, column: KanbanColumn): HTMLElement {
		const columnEl = container.createDiv('kanban-column');
		columnEl.setAttribute('data-column-id', column.id);

		// Column header
		const header = columnEl.createDiv('kanban-column-header');
		const title = header.createEl('h3', { cls: 'kanban-column-title' });
		title.createSpan({ text: column.title });
		title.createSpan({
			text: column.tasks.length.toString(),
			cls: 'kanban-column-count'
		});

		// Column body
		const body = columnEl.createDiv('kanban-column-body');

		// Render tasks
		for (const task of column.tasks) {
			this.renderTask(body, task);
		}

		// Add task button
		const addTaskBtn = body.createEl('button', {
			text: '+ Add Task',
			cls: 'kanban-add-task-btn'
		});
		addTaskBtn.addEventListener('click', () => this.createNewTask(column.id));

		return columnEl;
	}

	private renderTask(container: HTMLElement, task: KanbanTask): HTMLElement {
		const taskEl = container.createDiv('kanban-task');
		taskEl.setAttribute('data-task-id', task.id);
		taskEl.draggable = true;

		// Task title
		taskEl.createEl('h4', { text: task.title, cls: 'kanban-task-title' });

		// Task description (truncated)
		if (task.description) {
			const desc = task.description.length > 100
				? task.description.substring(0, 100) + '...'
				: task.description;
			taskEl.createEl('p', { text: desc, cls: 'kanban-task-description' });
		}

		// Task metadata
		const meta = taskEl.createDiv('kanban-task-meta');

		// Priority badge
		if (task.priority) {
			meta.createSpan({
				text: task.priority.toUpperCase(),
				cls: `kanban-task-priority priority-${task.priority.toLowerCase()}`
			});
		}

		// Due date
		if (task.dueDate) {
			const dueEl = meta.createSpan({
				text: `Due: ${task.dueDate}`,
				cls: 'kanban-task-due'
			});

			// Highlight overdue tasks
			if (new Date(task.dueDate) < new Date()) {
				dueEl.addClass('overdue');
			}
		}

		// Assignee
		if (task.assignee) {
			meta.createSpan({
				text: `@${task.assignee}`,
				cls: 'kanban-task-assignee'
			});
		}

		// Estimated hours
		if (task.estimatedHours) {
			meta.createSpan({
				text: `${task.estimatedHours}h`,
				cls: 'kanban-task-hours'
			});
		}

		// Tags
		if (task.tags && task.tags.length > 0) {
			const tagsEl = taskEl.createDiv('kanban-task-tags');
			task.tags.slice(0, 3).forEach(tag => {
				tagsEl.createSpan({ text: `#${tag}`, cls: 'kanban-task-tag' });
			});
		}

		// Event listeners
		taskEl.addEventListener('dragstart', (e) => this.onTaskDragStart(e, task));
		taskEl.addEventListener('dragend', (e) => this.onTaskDragEnd(e));
		taskEl.addEventListener('click', (e) => this.onTaskClick(e, task));

		return taskEl;
	}

	private setupDropZone(columnEl: HTMLElement, columnId: string): void {
		columnEl.addEventListener('dragover', (e) => {
			e.preventDefault();
			columnEl.addClass('drag-over');
		});

		columnEl.addEventListener('dragleave', (e) => {
			if (!columnEl.contains(e.relatedTarget as Node)) {
				columnEl.removeClass('drag-over');
			}
		});

		columnEl.addEventListener('drop', (e) => {
			e.preventDefault();
			columnEl.removeClass('drag-over');
			this.onTaskDrop(e, columnId);
		});
	}

	private onTaskDragStart(event: DragEvent, task: KanbanTask): void {
		this.isDragging = true;
		this.draggedTask = task;

		const taskEl = event.target as HTMLElement;
		taskEl.addClass('dragging');

		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', task.id);
		}
	}

	private onTaskDragEnd(event: DragEvent): void {
		this.isDragging = false;

		const taskEl = event.target as HTMLElement;
		taskEl.removeClass('dragging');

		// Clean up drag-over classes
		this.containerEl.querySelectorAll('.drag-over').forEach(el => {
			el.removeClass('drag-over');
		});
	}

	private async onTaskDrop(event: DragEvent, targetColumnId: string): Promise<void> {
		if (!this.draggedTask) return;

		try {
			// Find source and target columns
			let sourceColumn: KanbanColumn | undefined;
			let targetColumn: KanbanColumn | undefined;

			if (!this.kanbanBoard || !this.draggedTask) return;

			for (const column of this.kanbanBoard.columns) {
				if (column.tasks.some(t => t.id === this.draggedTask?.id)) {
					sourceColumn = column;
				}
				if (column.id === targetColumnId) {
					targetColumn = column;
				}
			}

			if (!sourceColumn || !targetColumn || sourceColumn.id === targetColumn.id) {
				return;
			}

			// Move task between columns
			const taskIndex = sourceColumn.tasks.findIndex(t => t.id === this.draggedTask?.id);
			if (taskIndex > -1) {
				const [task] = sourceColumn.tasks.splice(taskIndex, 1);
				targetColumn.tasks.push(task);

				// Update task status in file
				await this.updateTaskStatus(task.id, this.getStatusFromColumnId(targetColumnId));

				// Re-render board
				const boardContainer = this.containerEl.querySelector('.kanban-board-container') as HTMLElement;
				if (boardContainer) {
					boardContainer.empty();
					await this.renderBoard(boardContainer);
				}
			}
		} catch (error) {
			this.errorHandler.handle(error as Error, { taskId: this.draggedTask.id, targetColumnId });
		} finally {
			this.draggedTask = null;
		}
	}

	private getStatusFromColumnId(columnId: string): TaskStatus {
		const statusMap: { [key: string]: TaskStatus } = {
			'todo': TaskStatus.TODO,
			'in-progress': TaskStatus.IN_PROGRESS,
			'review': TaskStatus.REVIEW,
			'testing': TaskStatus.TESTING,
			'blocked': TaskStatus.BLOCKED,
			'done': TaskStatus.DONE,
			'cancelled': TaskStatus.CANCELLED
		};
		return statusMap[columnId] || TaskStatus.TODO;
	}

	private async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(taskId) as TFile;
			if (!file) return;

			const content = await this.app.vault.read(file);
			const lines = content.split('\n');

			// Update frontmatter
			let inFrontmatter = false;
			let frontmatterEnd = -1;

			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim() === '---') {
					if (!inFrontmatter) {
						inFrontmatter = true;
					} else {
						frontmatterEnd = i;
						break;
					}
				} else if (inFrontmatter && lines[i].startsWith('status:')) {
					lines[i] = `status: ${newStatus}`;
				}
			}

			// Also update the updated timestamp
			for (let i = 0; i < frontmatterEnd; i++) {
				if (lines[i].startsWith('updated:')) {
					lines[i] = `updated: ${new Date().toISOString().split('T')[0]}`;
					break;
				}
			}

			await this.app.vault.modify(file, lines.join('\n'));
		} catch (error) {
			console.error('Failed to update task status:', error);
			this.errorHandler.handle(new FileOperationError('Failed to update task status', taskId, 'update'));
		}
	}

	private async onTaskClick(event: Event, task: KanbanTask): Promise<void> {
		// Open task file for editing
		try {
			const file = this.app.vault.getAbstractFileByPath(task.id) as TFile;
			if (file) {
				await this.app.workspace.openLinkText(file.path, '', false);
			}
		} catch (error) {
			console.error('Failed to open task:', error);
			this.errorHandler.handle(new FileOperationError('Failed to open task', task.id, 'open'));
		}
	}

	private async createNewTask(columnId?: string): Promise<void> {
		try {
			// Import task creation modal
			const { TaskCreationModal } = await import('../modals/TaskCreationModal');

			new TaskCreationModal(this.app, async (data) => {
				// Set status based on column
				if (columnId) {
					data.status = this.getStatusFromColumnId(columnId);
				}

				await this.plugin.taskManager.createTaskFromModal(data);
				await this.refreshBoard();
			}, []).open();
		} catch (error) {
			this.errorHandler.handle(error as Error, { columnId });
		}
	}

	public async refreshBoard(): Promise<void> {
		try {
			const projectSelect = this.containerEl.querySelector('select') as HTMLSelectElement;
			const projectId = projectSelect?.value || undefined;

			await this.initializeBoard(projectId);

			const boardContainer = this.containerEl.querySelector('.kanban-board-container') as HTMLElement;
			if (boardContainer) {
				boardContainer.empty();
				await this.renderBoard(boardContainer);
			}
		} catch (error) {
			this.errorHandler.handle(error as Error);
		}
	}

	private async loadTasksForColumn(container: HTMLElement, status: string): Promise<void> {
		try {
			const tasks = this.app.vault.getMarkdownFiles()
				.filter(file => file.path.includes('task') || file.path.includes('Task'));

			for (const file of tasks) {
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.frontmatter?.status === status) {
					const taskCard = container.createDiv("kanban-task");
					taskCard.createEl("h4", { text: file.basename });

					if (cache.frontmatter.priority) {
						taskCard.createEl("span", {
							text: cache.frontmatter.priority,
							cls: `priority-${cache.frontmatter.priority.toLowerCase()}`
						});
					}

					if (cache.frontmatter.dueDate) {
						taskCard.createEl("span", { text: `Due: ${cache.frontmatter.dueDate}` });
					}

					taskCard.addEventListener("click", () => {
						this.app.workspace.openLinkText(file.path, "", false);
					});
				}
			}
		} catch (error) {
			this.errorHandler.handle(error as Error, { status });
		}
	}
}

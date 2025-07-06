import { App, normalizePath, Notice, TFile } from 'obsidian';
import { TaskCreationData } from '../modals/TaskCreationModal';
import { Priority, ProjectManagerSettings, Task, TaskStatus } from '../types';

export class TaskManager {
	app: App;
	settings: ProjectManagerSettings;

	constructor(app: App, settings: ProjectManagerSettings) {
		this.app = app;
		this.settings = settings;
	}

	// Utility method for notices to satisfy linting
	private showNotice(message: string): Notice {
		return new Notice(message);
	}

	async createTask(taskData: Partial<Task>): Promise<TFile | null> {
		try {
			// Ensure tasks folder exists
			await this.ensureTasksFolder();

			// Generate task file name
			const fileName = this.sanitizeFileName(taskData.title ?? 'New Task');
			const filePath = normalizePath(`${this.getTasksFolder()}/${fileName}.md`);

			// Check if file already exists
			if (this.app.vault.getAbstractFileByPath(filePath)) {
				console.log(`Task "${fileName}" already exists`);
				return null;
			}

			// Create task content
			const content = this.generateTaskContent(taskData);

			// Create the file
			const file = await this.app.vault.create(filePath, content);

			if (this.settings.showNotifications) {
				console.log(`Task "${fileName}" created successfully`);
			}

			return file;
		} catch (error) {
			console.error('Error creating task:', error);
			console.log('Error creating task');
			return null;
		}
	}

	async createTaskFromModal(data: TaskCreationData): Promise<TFile | null> {
		// Convert the modal data to the format expected by createTask
		const taskData = {
			title: data.title,
			description: data.description,
			priority: data.priority,
			assignee: data.assignee,
			dueDate: data.dueDate,
			estimatedHours: data.estimatedHours,
			tags: data.tags,
			parentProject: data.projectId
		};

		return this.createTask(taskData);
	}

	async generateDailyPlanner(): Promise<void> {
		try {
			const today = new Date();
			const dateString = today.toISOString().split('T')[0];

			// Ensure daily notes folder exists
			await this.ensureDailyNotesFolder();

			const fileName = `Daily Planner ${dateString}`;
			const filePath = normalizePath(`${this.settings.dailyNotesFolder}/${fileName}.md`);

			// Check if daily planner already exists
			if (this.app.vault.getAbstractFileByPath(filePath)) {
				this.showNotice('Daily planner for today already exists');
				return;
			}

			// Get tasks due today or overdue
			const tasks = await this.getTasksDueToday();

			// Generate daily planner content
			const content = this.generateDailyPlannerContent(dateString, tasks);

			// Create the file
			await this.app.vault.create(filePath, content);

		} catch (error) {
			console.error('Error generating daily planner:', error);
			this.showNotice('Error generating daily planner');
		}
	}

	async getTasksDueToday(): Promise<Task[]> {
		const today = new Date().toISOString().split('T')[0];
		const allFiles = this.app.vault.getMarkdownFiles();
		const tasks: Task[] = [];

		for (const file of allFiles) {
			const task = this.extractTaskFromFile(file, today);
			if (task) {
				tasks.push(task);
			}
		}

		return this.sortTasksByPriorityAndDate(tasks);
	}

	private extractTaskFromFile(file: TFile, today: string): Task | null {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return null;
		}

		const { frontmatter } = cache;
		if (!this.isTaskDueOrOverdue(frontmatter.dueDate, frontmatter.status, today)) {
			return null;
		}

		return this.createTaskFromFrontmatter(file, frontmatter);
	}

	private isTaskDueOrOverdue(dueDate: string, status: string, today: string): boolean {
		return Boolean(dueDate) &&
			(dueDate === today || dueDate < today) &&
			status !== 'Done' &&
			status !== 'Completed';
	}

	private createTaskFromFrontmatter(file: TFile, frontmatter: Record<string, unknown>): Task {
		return {
			id: file.path,
			title: frontmatter.title as string ?? file.basename,
			description: frontmatter.description as string ?? '',
			status: (frontmatter.status as TaskStatus) ?? 'To Do',
			priority: (frontmatter.priority as Priority) ?? 'medium',
			dueDate: frontmatter.dueDate as string,
			assignee: frontmatter.assignee as string ?? '',
			estimatedHours: frontmatter.estimatedHours as number,
			actualHours: frontmatter.actualHours as number,
			progress: frontmatter.progress as number ?? 0,
			tags: frontmatter.tags as string[] ?? [],
			dependencies: frontmatter.dependencies as string[] ?? [],
			subtasks: [],
			parentProject: frontmatter.projectId as string ?? frontmatter.project as string ?? '',
			file: file,
			created: frontmatter.created as string ?? file.stat.ctime.toString(),
			updated: frontmatter.updated as string ?? new Date().toISOString(),
			comments: []
		};
	}

	private sortTasksByPriorityAndDate(tasks: Task[]): Task[] {
		return tasks.sort((a, b) => {
			const priorityComparison = this.comparePriorities(a.priority, b.priority);
			if (priorityComparison !== 0) {
				return priorityComparison;
			}

			return this.compareDueDates(a.dueDate, b.dueDate);
		});
	}

	private comparePriorities(priorityA: string, priorityB: string): number {
		const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
		const aPriority = priorityOrder[priorityA.toLowerCase() as keyof typeof priorityOrder] ?? 4;
		const bPriority = priorityOrder[priorityB.toLowerCase() as keyof typeof priorityOrder] ?? 4;
		return aPriority - bPriority;
	}

	private compareDueDates(dueDateA?: string, dueDateB?: string): number {
		if (dueDateA && dueDateB) {
			return dueDateA.localeCompare(dueDateB);
		}
		return 0;
	}

	private async ensureTasksFolder(): Promise<void> {
		const folderPath = this.getTasksFolder();
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	private async ensureDailyNotesFolder(): Promise<void> {
		const folderPath = normalizePath(this.settings.dailyNotesFolder);
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	private getTasksFolder(): string {
		return normalizePath(`${this.settings.projectsFolder}/Tasks`);
	}

	private sanitizeFileName(name: string): string {
		return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
	}

	private generateTaskContent(taskData: Partial<Task>): string {
		const frontmatter = this.createTaskFrontmatter(taskData);
		const body = this.createTaskBody(taskData);
		return this.combineFrontmatterAndBody(frontmatter, body);
	}

	private createTaskFrontmatter(taskData: Partial<Task>): Record<string, unknown> {
		const today = new Date().toISOString().split('T')[0];

		return {
			title: taskData.title ?? 'New Task',
			type: 'task',
			status: taskData.status ?? 'To Do',
			priority: taskData.priority ?? 'Medium',
			created: today,
			updated: today,
			dueDate: taskData.dueDate ?? '',
			assignee: taskData.assignee ?? '',
			parentProject: taskData.parentProject ?? '',
			estimatedHours: taskData.estimatedHours ?? 0,
			progress: taskData.progress ?? 0,
			tags: taskData.tags ?? [],
			dependencies: taskData.dependencies ?? [],
			description: taskData.description ?? ''
		};
	}

	private createTaskBody(taskData: Partial<Task>): string {
		let body = `# ${taskData.title ?? 'New Task'}\n\n`;
		body += `## Description\n\n${taskData.description ?? 'Task description...'}\n\n`;
		body += `## Acceptance Criteria\n\n- [ ] Criteria 1\n- [ ] Criteria 2\n\n`;
		body += `## Notes\n\n`;
		return body;
	}

	private combineFrontmatterAndBody(frontmatter: Record<string, unknown>, body: string): string {
		let content = '---\n';

		for (const [key, value] of Object.entries(frontmatter)) {
			content += this.formatFrontmatterField(key, value);
		}

		content += '---\n\n';
		content += body;
		return content;
	}

	private formatFrontmatterField(key: string, value: unknown): string {
		if (Array.isArray(value)) {
			let formatted = `${key}:\n`;
			for (const item of value) {
				formatted += `  - ${item}\n`;
			}
			return formatted;
		}
		return `${key}: ${value}\n`;
	}

	private generateDailyPlannerContent(dateString: string, tasks: Task[]): string {
		const sections = [
			this.generatePlannerHeader(dateString),
			this.generateFocusSection(),
			this.generateTasksSection(dateString, tasks),
			this.generateScheduleSection(),
			this.generateNotesSection(),
			this.generateTomorrowSection()
		];

		return sections.join('');
	}

	private generatePlannerHeader(dateString: string): string {
		let content = `---\n`;
		content += `title: Daily Planner ${dateString}\n`;
		content += `type: daily-planner\n`;
		content += `date: ${dateString}\n`;
		content += `created: ${new Date().toISOString()}\n`;
		content += `---\n\n`;
		content += `# Daily Planner - ${dateString}\n\n`;
		return content;
	}

	private generateFocusSection(): string {
		let content = `## Today's Focus\n\n`;
		content += `*What are the 3 most important things to accomplish today?*\n\n`;
		content += `1. \n`;
		content += `2. \n`;
		content += `3. \n\n`;
		return content;
	}

	private generateTasksSection(dateString: string, tasks: Task[]): string {
		if (tasks.length === 0) {
			return this.generateEmptyTasksSection();
		}

		const { overdueTasks, todayTasks } = this.categorizeTasks(tasks, dateString);

		let content = `## Tasks Due Today\n\n`;
		content += this.generateOverdueTasksSection(overdueTasks);
		content += this.generateTodayTasksSection(todayTasks);

		return content;
	}

	private generateEmptyTasksSection(): string {
		return `## Tasks\n\n*No tasks due today. Great job staying on top of things!*\n\n`;
	}

	private categorizeTasks(tasks: Task[], dateString: string): { overdueTasks: Task[], todayTasks: Task[] } {
		const overdueTasks = tasks.filter(task => task.dueDate && task.dueDate < dateString);
		const todayTasks = tasks.filter(task => task.dueDate === dateString);
		return { overdueTasks, todayTasks };
	}

	private generateOverdueTasksSection(overdueTasks: Task[]): string {
		if (overdueTasks.length === 0) {
			return '';
		}

		let content = `### ⚠️ Overdue Tasks\n\n`;
		for (const task of overdueTasks) {
			content += this.generateTaskLine(task, true);
		}
		content += `\n`;
		return content;
	}

	private generateTodayTasksSection(todayTasks: Task[]): string {
		if (todayTasks.length === 0) {
			return '';
		}

		let content = `### 📅 Due Today\n\n`;
		for (const task of todayTasks) {
			content += this.generateTaskLine(task, false);
		}
		content += `\n`;
		return content;
	}

	private generateTaskLine(task: Task, showDueDate: boolean): string {
		const checkbox = task.status === TaskStatus.DONE ? 'x' : ' ';
		const dueDateInfo = showDueDate ? ` - Due: ${task.dueDate}` : '';
		return `- [${checkbox}] [[${task.file?.path}|${task.title}]] (${task.priority})${dueDateInfo}\n`;
	}

	private generateScheduleSection(): string {
		let content = `## Schedule\n\n`;
		content += `| Time | Activity |\n`;
		content += `|------|----------|\n`;
		content += this.generateScheduleRows();
		content += `\n`;
		return content;
	}

	private generateScheduleRows(): string {
		const scheduleSlots = this.getDefaultScheduleSlots();

		return scheduleSlots
			.map(time => {
				const activity = this.getDefaultActivityForTime(time);
				return `| ${time} | ${activity} |\n`;
			})
			.join('');
	}

	private getDefaultScheduleSlots(): string[] {
		return ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
	}

	private getDefaultActivityForTime(time: string): string {
		return time === '12:00' ? 'Lunch' : '';
	}

	private generateNotesSection(): string {
		return `## Notes\n\n*Daily observations, ideas, and reflections*\n\n`;
	}

	private generateTomorrowSection(): string {
		return `## Tomorrow's Prep\n\n*What needs to be prepared for tomorrow?*\n\n`;
	}
}

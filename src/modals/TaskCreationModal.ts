import { App, Modal, Notice, Setting } from 'obsidian';
import { Priority, TaskStatus } from '../types';

export interface TaskCreationData {
	title: string;
	description: string;
	status?: TaskStatus;
	priority: Priority;
	assignee: string;
	dueDate: string;
	estimatedHours?: number;
	tags: string[];
	projectId: string;
}

export class TaskCreationModal extends Modal {
	private readonly data: TaskCreationData;
	private readonly onSubmit: (data: TaskCreationData) => void;
	private readonly availableProjects: string[];

	constructor(app: App, onSubmit: (data: TaskCreationData) => void, availableProjects: string[] = []) {
		super(app);
		this.onSubmit = onSubmit;
		this.availableProjects = availableProjects;
		this.data = {
			title: '',
			description: '',
			priority: Priority.MEDIUM,
			assignee: '',
			dueDate: '',
			estimatedHours: undefined,
			tags: [],
			projectId: availableProjects[0] ?? ''
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Create New Task' });

		// Task title
		new Setting(contentEl)
			.setName('Task Title')
			.setDesc('Enter the title of your task')
			.addText(text => text
				.setPlaceholder('Complete user authentication')
				.setValue(this.data.title)
				.onChange(value => {
					this.data.title = value;
				}));

		// Task description
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Detailed description of the task')
			.addTextArea(text => text
				.setPlaceholder('Task description...')
				.setValue(this.data.description)
				.onChange(value => {
					this.data.description = value;
				}));

		// Project selection
		if (this.availableProjects.length > 0) {
			const projectOptions: Record<string, string> = {};
			this.availableProjects.forEach(project => {
				projectOptions[project] = project;
			});

			new Setting(contentEl)
				.setName('Project')
				.setDesc('Select the project this task belongs to')
				.addDropdown(dropdown => dropdown
					.addOptions(projectOptions)
					.setValue(this.data.projectId)
					.onChange(value => {
						this.data.projectId = value;
					}));
		} else {
			new Setting(contentEl)
				.setName('Project ID')
				.setDesc('Enter the project this task belongs to')
				.addText(text => text
					.setPlaceholder('project-id')
					.setValue(this.data.projectId)
					.onChange(value => {
						this.data.projectId = value;
					}));
		}

		// Priority
		new Setting(contentEl)
			.setName('Priority')
			.setDesc('Task priority level')
			.addDropdown(dropdown => dropdown
				.addOptions({
					[Priority.LOW]: 'Low',
					[Priority.MEDIUM]: 'Medium',
					[Priority.HIGH]: 'High',
					[Priority.CRITICAL]: 'Critical'
				})
				.setValue(this.data.priority)
				.onChange(value => {
					this.data.priority = value as Priority;
				}));

		// Assignee
		new Setting(contentEl)
			.setName('Assignee')
			.setDesc('Person responsible for this task')
			.addText(text => text
				.setPlaceholder('john.doe')
				.setValue(this.data.assignee)
				.onChange(value => {
					this.data.assignee = value;
				}));

		// Due date
		new Setting(contentEl)
			.setName('Due Date')
			.setDesc('When the task should be completed (optional)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.data.dueDate)
				.onChange(value => {
					this.data.dueDate = value;
				}));

		// Estimated hours
		new Setting(contentEl)
			.setName('Estimated Hours')
			.setDesc('How many hours this task is expected to take')
			.addText(text => text
				.setPlaceholder('8')
				.setValue(this.data.estimatedHours?.toString() ?? '')
				.onChange(value => {
					const numValue = parseFloat(value);
					this.data.estimatedHours = isNaN(numValue) ? undefined : numValue;
				}));

		// Tags
		new Setting(contentEl)
			.setName('Tags')
			.setDesc('Comma-separated tags for the task')
			.addText(text => text
				.setPlaceholder('frontend, authentication, urgent')
				.setValue(this.data.tags.join(', '))
				.onChange(value => {
					this.data.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
				}));

		// Buttons
		const buttonContainer = contentEl.createDiv('task-modal-buttons');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.marginTop = '20px';

		// Cancel button
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.close();
		});

		// Create button
		const createButton = buttonContainer.createEl('button', {
			text: 'Create Task',
			cls: 'mod-cta'
		});
		createButton.addEventListener('click', () => {
			this.handleSubmit();
		});
	}

	private handleSubmit(): void {
		// Validate required fields
		if (!this.data.title.trim()) {
			this.showNotice('Task title is required');
			return;
		}

		if (!this.data.projectId.trim()) {
			this.showNotice('Project ID is required');
			return;
		}

		// Validate date format if provided
		if (this.data.dueDate) {
			const dueDate = new Date(this.data.dueDate);
			if (isNaN(dueDate.getTime())) {
				this.showNotice('Invalid due date format. Please use YYYY-MM-DD');
				return;
			}
		}

		// Submit the data
		this.onSubmit(this.data);
		this.close();
	}

	private showNotice(message: string): Notice {
		return new Notice(message);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

import { App, Modal, Notice, Setting } from 'obsidian';
import { Priority, ProjectType } from '../types';

export interface ProjectCreationData {
	name: string;
	description: string;
	type: ProjectType;
	priority: Priority;
	startDate: string;
	endDate: string;
	tags: string[];
	assignees: string[];
	budget?: number;
}

export class ProjectCreationModal extends Modal {
	private readonly data: ProjectCreationData;
	private readonly onSubmit: (data: ProjectCreationData) => void;

	constructor(app: App, onSubmit: (data: ProjectCreationData) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.data = {
			name: '',
			description: '',
			type: ProjectType.OTHER,
			priority: Priority.MEDIUM,
			startDate: new Date().toISOString().split('T')[0],
			endDate: '',
			tags: [],
			assignees: [],
			budget: undefined
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Create New Project' });

		// Project name
		new Setting(contentEl)
			.setName('Project Name')
			.setDesc('Enter the name of your project')
			.addText(text => text
				.setPlaceholder('My Awesome Project')
				.setValue(this.data.name)
				.onChange(value => {
					this.data.name = value;
				}));

		// Project description
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Brief description of the project')
			.addTextArea(text => text
				.setPlaceholder('Project description...')
				.setValue(this.data.description)
				.onChange(value => {
					this.data.description = value;
				}));

		// Project type
		new Setting(contentEl)
			.setName('Project Type')
			.setDesc('Select the type of project')
			.addDropdown(dropdown => dropdown
				.addOptions({
					[ProjectType.DEVELOPMENT]: 'Development',
					[ProjectType.RESEARCH]: 'Research',
					[ProjectType.DOCUMENTATION]: 'Documentation',
					[ProjectType.DESIGN]: 'Design',
					[ProjectType.CONSULTING]: 'Consulting',
					[ProjectType.ANALYSIS]: 'Analysis',
					[ProjectType.MAINTENANCE]: 'Maintenance',
					[ProjectType.IMPLEMENTATION]: 'Implementation',
					[ProjectType.OTHER]: 'Other'
				})
				.setValue(this.data.type)
				.onChange(value => {
					this.data.type = value as ProjectType;
				}));

		// Priority
		new Setting(contentEl)
			.setName('Priority')
			.setDesc('Project priority level')
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

		// Start date
		new Setting(contentEl)
			.setName('Start Date')
			.setDesc('When the project begins')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.data.startDate)
				.onChange(value => {
					this.data.startDate = value;
				}));

		// End date
		new Setting(contentEl)
			.setName('End Date')
			.setDesc('Target completion date (optional)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.data.endDate)
				.onChange(value => {
					this.data.endDate = value;
				}));

		// Tags
		new Setting(contentEl)
			.setName('Tags')
			.setDesc('Comma-separated tags for the project')
			.addText(text => text
				.setPlaceholder('tag1, tag2, tag3')
				.setValue(this.data.tags.join(', '))
				.onChange(value => {
					this.data.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
				}));

		// Assignees
		new Setting(contentEl)
			.setName('Assignees')
			.setDesc('Comma-separated list of project members')
			.addText(text => text
				.setPlaceholder('john.doe, jane.smith')
				.setValue(this.data.assignees.join(', '))
				.onChange(value => {
					this.data.assignees = value.split(',').map(assignee => assignee.trim()).filter(assignee => assignee.length > 0);
				}));

		// Budget
		new Setting(contentEl)
			.setName('Budget')
			.setDesc('Project budget (optional)')
			.addText(text => text
				.setPlaceholder('10000')
				.setValue(this.data.budget?.toString() ?? '')
				.onChange(value => {
					const numValue = parseFloat(value);
					this.data.budget = isNaN(numValue) ? undefined : numValue;
				}));

		// Buttons
		const buttonContainer = contentEl.createDiv('project-modal-buttons');
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
			text: 'Create Project',
			cls: 'mod-cta'
		});
		createButton.addEventListener('click', () => {
			this.handleSubmit();
		});
	}

	private handleSubmit(): void {
		// Validate required fields
		if (!this.data.name.trim()) {
			this.showNotice('Project name is required');
			return;
		}

		if (!this.data.description.trim()) {
			this.showNotice('Project description is required');
			return;
		}

		if (!this.data.startDate) {
			this.showNotice('Start date is required');
			return;
		}

		// Validate date format
		const startDate = new Date(this.data.startDate);
		if (isNaN(startDate.getTime())) {
			this.showNotice('Invalid start date format. Please use YYYY-MM-DD');
			return;
		}

		if (this.data.endDate) {
			const endDate = new Date(this.data.endDate);
			if (isNaN(endDate.getTime())) {
				this.showNotice('Invalid end date format. Please use YYYY-MM-DD');
				return;
			}

			if (endDate <= startDate) {
				this.showNotice('End date must be after start date');
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

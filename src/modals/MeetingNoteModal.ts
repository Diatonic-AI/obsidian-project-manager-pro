import { App, Modal, Notice, Setting } from 'obsidian';

export interface MeetingNoteData {
	title: string;
	date: string;
	attendees: string[];
	agenda: string;
	notes: string;
	actionItems: string[];
	projectId?: string;
}

export class MeetingNoteModal extends Modal {
	private readonly data: MeetingNoteData;
	private readonly onSubmit: (data: MeetingNoteData) => void;
	private readonly availableProjects: string[];

	constructor(app: App, onSubmit: (data: MeetingNoteData) => void, availableProjects: string[] = []) {
		super(app);
		this.onSubmit = onSubmit;
		this.availableProjects = availableProjects;
		this.data = {
			title: '',
			date: new Date().toISOString().split('T')[0],
			attendees: [],
			agenda: '',
			notes: '',
			actionItems: [],
			projectId: availableProjects[0] ?? undefined
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Create Meeting Note' });

		// Meeting title
		new Setting(contentEl)
			.setName('Meeting Title')
			.setDesc('Enter the title of the meeting')
			.addText(text => text
				.setPlaceholder('Weekly Project Standup')
				.setValue(this.data.title)
				.onChange(value => {
					this.data.title = value;
				}));

		// Meeting date
		new Setting(contentEl)
			.setName('Meeting Date')
			.setDesc('Date of the meeting')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.data.date)
				.onChange(value => {
					this.data.date = value;
				}));

		// Project selection (optional)
		if (this.availableProjects.length > 0) {
			const projectOptions: Record<string, string> = {
				'': 'No Project'
			};
			this.availableProjects.forEach(project => {
				projectOptions[project] = project;
			});

			new Setting(contentEl)
				.setName('Related Project')
				.setDesc('Select the project this meeting is related to (optional)')
				.addDropdown(dropdown => dropdown
					.addOptions(projectOptions)
					.setValue(this.data.projectId ?? '')
					.onChange(value => {
						this.data.projectId = value || undefined;
					}));
		}

		// Attendees
		new Setting(contentEl)
			.setName('Attendees')
			.setDesc('Comma-separated list of meeting attendees')
			.addText(text => text
				.setPlaceholder('john.doe, jane.smith, bob.wilson')
				.setValue(this.data.attendees.join(', '))
				.onChange(value => {
					this.data.attendees = value.split(',').map(attendee => attendee.trim()).filter(attendee => attendee.length > 0);
				}));

		// Agenda
		new Setting(contentEl)
			.setName('Agenda')
			.setDesc('Meeting agenda or topics to discuss')
			.addTextArea(text => text
				.setPlaceholder('1. Project status update\n2. Discuss blockers\n3. Plan next steps')
				.setValue(this.data.agenda)
				.onChange(value => {
					this.data.agenda = value;
				}));

		// Notes
		new Setting(contentEl)
			.setName('Meeting Notes')
			.setDesc('Notes and discussion points from the meeting')
			.addTextArea(text => text
				.setPlaceholder('Meeting notes and key discussion points...')
				.setValue(this.data.notes)
				.onChange(value => {
					this.data.notes = value;
				}));

		// Action items
		new Setting(contentEl)
			.setName('Action Items')
			.setDesc('Action items from the meeting (one per line)')
			.addTextArea(text => text
				.setPlaceholder('- John to review PR #123\n- Jane to update documentation\n- Schedule follow-up meeting')
				.setValue(this.data.actionItems.join('\n'))
				.onChange(value => {
					this.data.actionItems = value.split('\n').map(item => item.trim()).filter(item => item.length > 0);
				}));

		// Buttons
		const buttonContainer = contentEl.createDiv('meeting-modal-buttons');
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
			text: 'Create Meeting Note',
			cls: 'mod-cta'
		});
		createButton.addEventListener('click', () => {
			this.handleSubmit();
		});
	}

	private handleSubmit(): void {
		// Validate required fields
		if (!this.data.title.trim()) {
			this.showNotice('Meeting title is required');
			return;
		}

		if (!this.data.date) {
			this.showNotice('Meeting date is required');
			return;
		}

		// Validate date format
		const meetingDate = new Date(this.data.date);
		if (isNaN(meetingDate.getTime())) {
			this.showNotice('Invalid date format. Please use YYYY-MM-DD');
			return;
		}

		if (this.data.attendees.length === 0) {
			this.showNotice('At least one attendee is required');
			return;
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

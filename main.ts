import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { AutomationEngine } from './src/core/AutomationEngine';
import { ProjectManager } from './src/core/ProjectManager';
import { TaskManager } from './src/core/TaskManager';
import { TemplateManager } from './src/core/TemplateManager';
import { MeetingNoteData, MeetingNoteModal } from './src/modals/MeetingNoteModal';
import { ProjectCreationModal } from './src/modals/ProjectCreationModal';
import { TaskCreationModal } from './src/modals/TaskCreationModal';
import { DEFAULT_SETTINGS, ProjectManagerSettings } from './src/types';
import { DASHBOARD_VIEW_TYPE, DashboardView } from './src/views/DashboardView';
import { GANTT_VIEW_TYPE, GanttView } from './src/views/GanttView';
import { KANBAN_VIEW_TYPE, KanbanView } from './src/views/KanbanView';
import { PROJECT_MANAGER_VIEW_TYPE, ProjectManagerView } from './src/views/ProjectManagerView';

export default class ProjectManagerPlugin extends Plugin {
	settings: ProjectManagerSettings;
	projectManager: ProjectManager;
	templateManager: TemplateManager;
	taskManager: TaskManager;
	automationEngine: AutomationEngine;

	// Utility method for notices to satisfy linting
	private showNotice(message: string): Notice {
		return new Notice(message);
	}

	async onload() {
		console.log('Loading Obsidian Project Manager Pro...');

		await this.loadSettings();

		// Initialize core managers
		this.projectManager = new ProjectManager(this.app, this.settings);
		this.templateManager = new TemplateManager(this.app, this.settings.templatesFolder);
		this.taskManager = new TaskManager(this.app, this.settings);
		this.automationEngine = new AutomationEngine(this.app, this.settings);

		// Register views
		this.registerView(PROJECT_MANAGER_VIEW_TYPE, (leaf) => new ProjectManagerView(leaf, this));
		this.registerView(KANBAN_VIEW_TYPE, (leaf) => new KanbanView(leaf, this));
		this.registerView(GANTT_VIEW_TYPE, (leaf) => new GanttView(leaf, this));
		this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));

		// Add ribbon icons
		this.addRibbonIcon('folder-plus', 'Project Manager', () => {
			this.activateView(PROJECT_MANAGER_VIEW_TYPE);
		});

		this.addRibbonIcon('calendar', 'Project Dashboard', () => {
			this.activateView(DASHBOARD_VIEW_TYPE);
		});

		// Add commands
		this.addCommand({
			id: 'create-new-project',
			name: 'Create New Project',
			callback: () => {
				new ProjectCreationModal(this.app, (data) => {
					this.projectManager.createProjectFromModal(data);
				}).open();
			}
		});

		this.addCommand({
			id: 'create-new-task',
			name: 'Create New Task',
			callback: () => {
				new TaskCreationModal(this.app, (data) => {
					this.taskManager.createTaskFromModal(data);
				}, []).open();
			}
		});

		this.addCommand({
			id: 'open-project-manager',
			name: 'Open Project Manager',
			callback: () => {
				this.activateView(PROJECT_MANAGER_VIEW_TYPE);
			}
		});

		this.addCommand({
			id: 'open-kanban-board',
			name: 'Open Kanban Board',
			callback: () => {
				this.activateView(KANBAN_VIEW_TYPE);
			}
		});

		this.addCommand({
			id: 'open-gantt-chart',
			name: 'Open Gantt Chart',
			callback: () => {
				this.activateView(GANTT_VIEW_TYPE);
			}
		});

		this.addCommand({
			id: 'open-dashboard',
			name: 'Open Project Dashboard',
			callback: () => {
				this.activateView(DASHBOARD_VIEW_TYPE);
			}
		});

		this.addCommand({
			id: 'create-meeting-note',
			name: 'Create Meeting Note',
			callback: () => {
				new MeetingNoteModal(this.app, (data) => {
					this.createMeetingNote(data);
				}).open();
			}
		});

		this.addCommand({
			id: 'generate-daily-planner',
			name: 'Generate Daily Planner',
			callback: async () => {
				await this.taskManager.generateDailyPlanner();
				// Intentional side effect for user notification
				// eslint-disable-next-line no-new
				this.showNotice('Daily planner generated!');
			}
		});

		this.addCommand({
			id: 'update-project-status',
			name: 'Update Project Status',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (view.file) {
					await this.projectManager.updateProjectFromFile(view.file);
					// Intentional side effect for user notification
					// eslint-disable-next-line no-new
					this.showNotice('Project status updated!');
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new ProjectManagerSettingTab(this.app, this));

		// Initialize automation engine
		await this.automationEngine.initialize();

		// Register file events for automation
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				await this.automationEngine.triggerAutomation('task_updated', { file });
			})
		);

		this.registerEvent(
			this.app.vault.on('create', async (file) => {
				await this.automationEngine.triggerAutomation('task_created', { file });
			})
		);

		console.log('Obsidian Project Manager Pro loaded successfully!');
	}

	onunload() {
		console.log('Unloading Obsidian Project Manager Pro...');
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView(viewType: string) {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(viewType);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view doesn't exist yet, create a new leaf
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: viewType, active: true });
		}

		// Reveal the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async createMeetingNote(data: MeetingNoteData): Promise<void> {
		try {
			const fileName = this.sanitizeFileName(data.title);
			const filePath = `${this.settings.dailyNotesFolder}/Meetings/${fileName}.md`;

			const content = this.generateMeetingNoteContent(data);
			await this.app.vault.create(filePath, content);

			if (this.settings.showNotifications) {
				new Notice(`Meeting note "${data.title}" created successfully`);
			}
		} catch (error) {
			console.error('Error creating meeting note:', error);
			// Intentional side effect for user notification
			// eslint-disable-next-line no-new
			this.showNotice('Error creating meeting note');
		}
	}

	private generateMeetingNoteContent(data: MeetingNoteData): string {
		const frontmatter = `---
type: meeting
title: ${data.title}
date: ${data.date}
project: ${data.projectId ?? ''}
attendees: [${data.attendees.map((a: string) => `"${a}"`).join(', ')}]
---

`;

		let content = `# ${data.title}\n\n`;
		content += `**Date:** ${data.date}\n`;
		content += `**Attendees:** ${data.attendees.join(', ')}\n\n`;

		if (data.agenda) {
			content += `## Agenda\n\n${data.agenda}\n\n`;
		}

		if (data.notes) {
			content += `## Notes\n\n${data.notes}\n\n`;
		}

		if (data.actionItems.length > 0) {
			content += `## Action Items\n\n`;
			for (const item of data.actionItems) {
				content += `- [ ] ${item}\n`;
			}
			content += '\n';
		}

		return frontmatter + content;
	}

	private sanitizeFileName(name: string): string {
		return name.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '-');
	}
}

class ProjectManagerSettingTab extends PluginSettingTab {
	plugin: ProjectManagerPlugin;

	constructor(app: App, plugin: ProjectManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Project Manager Settings' });

		// Projects folder setting
		new Setting(containerEl)
			.setName('Projects Folder')
			.setDesc('Folder where projects will be stored')
			.addText(text => text
				.setPlaceholder('Projects')
				.setValue(this.plugin.settings.projectsFolder)
				.onChange(async (value) => {
					this.plugin.settings.projectsFolder = value;
					await this.plugin.saveSettings();
				}));

		// Templates folder setting
		new Setting(containerEl)
			.setName('Templates Folder')
			.setDesc('Folder where project templates are stored')
			.addText(text => text
				.setPlaceholder('Templates/Projects')
				.setValue(this.plugin.settings.templatesFolder)
				.onChange(async (value) => {
					this.plugin.settings.templatesFolder = value;
					await this.plugin.saveSettings();
				}));

		// Daily notes setting
		new Setting(containerEl)
			.setName('Daily Notes Folder')
			.setDesc('Folder where daily planner notes will be created')
			.addText(text => text
				.setPlaceholder('Daily Notes')
				.setValue(this.plugin.settings.dailyNotesFolder)
				.onChange(async (value) => {
					this.plugin.settings.dailyNotesFolder = value;
					await this.plugin.saveSettings();
				}));

		// Auto-generate daily planner
		new Setting(containerEl)
			.setName('Auto-generate Daily Planner')
			.setDesc('Automatically generate daily planner notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoGenerateDailyPlanner)
				.onChange(async (value) => {
					this.plugin.settings.autoGenerateDailyPlanner = value;
					await this.plugin.saveSettings();
				}));

		// Default project template
		new Setting(containerEl)
			.setName('Default Project Template')
			.setDesc('Default template to use when creating new projects')
			.addText(text => text
				.setPlaceholder('Basic Project')
				.setValue(this.plugin.settings.defaultProjectTemplate)
				.onChange(async (value) => {
					this.plugin.settings.defaultProjectTemplate = value;
					await this.plugin.saveSettings();
				}));

		// Enable automation
		new Setting(containerEl)
			.setName('Enable Automation')
			.setDesc('Enable automated task creation and status updates')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutomation)
				.onChange(async (value) => {
					this.plugin.settings.enableAutomation = value;
					await this.plugin.saveSettings();
				}));

		// Date format
		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Format for dates in project files (YYYY-MM-DD)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		// Show notifications
		new Setting(containerEl)
			.setName('Show Notifications')
			.setDesc('Show notifications for project updates and reminders')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showNotifications = value;
					await this.plugin.saveSettings();
				}));
	}
}

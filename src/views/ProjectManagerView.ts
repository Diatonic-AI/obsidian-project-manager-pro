import { ItemView, WorkspaceLeaf } from 'obsidian';
import ProjectManagerPlugin from '../../main';
import { ProjectCreationModal } from '../modals/ProjectCreationModal';

export const PROJECT_MANAGER_VIEW_TYPE = "project-manager-view";

export class ProjectManagerView extends ItemView {
	plugin: ProjectManagerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ProjectManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return PROJECT_MANAGER_VIEW_TYPE;
	}

	getDisplayText() {
		return "Project Manager";
	}

	getIcon() {
		return "folder-plus";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h2", { text: "Project Manager" });

		// Create toolbar
		const toolbar = container.createDiv("project-toolbar");
		const newProjectBtn = toolbar.createEl("button", { text: "New Project" });
		newProjectBtn.addEventListener("click", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const modal = new ProjectCreationModal(this.app, (data: any) => {
				this.plugin.projectManager.createProject(data);
				this.refresh();
			});
			modal.open();
		});

		const refreshBtn = toolbar.createEl("button", { text: "Refresh" });
		refreshBtn.addEventListener("click", () => {
			this.refresh();
		});

		// Create project list
		const projectList = container.createDiv("project-list");
		await this.renderProjects(projectList);
	}

	async onClose() {
		// Nothing to clean up
	}

	async refresh() {
		const container = this.containerEl.children[1];
		const projectList = container.querySelector(".project-list") as HTMLElement;
		if (projectList) {
			projectList.empty();
			await this.renderProjects(projectList);
		}
	}

	async renderProjects(container: HTMLElement) {
		try {
			// Get all project files
			const projectFiles = this.app.vault.getMarkdownFiles()
				.filter(file => file.path.startsWith(this.plugin.settings.projectsFolder + "/"));

			if (projectFiles.length === 0) {
				container.createEl("p", { text: "No projects found. Create your first project!" });
				return;
			}

			// Create project cards
			for (const file of projectFiles) {
				const projectCard = container.createDiv("project-card");

				const header = projectCard.createDiv("project-header");
				header.createEl("h3", { text: file.basename });

				const meta = projectCard.createDiv("project-meta");

				// Read frontmatter to get project metadata
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.frontmatter) {
					const fm = cache.frontmatter;

					if (fm.status) {
						meta.createEl("span", {
							text: fm.status,
							cls: `status-${fm.status.toLowerCase().replace(/\s+/g, '-')}`
						});
					}

					if (fm.progress) {
						const progressBar = meta.createDiv("progress-bar");
						const progress = progressBar.createDiv("progress-fill");
						progress.style.width = `${fm.progress}%`;
						meta.createEl("span", { text: `${fm.progress}% complete` });
					}

					if (fm.dueDate) {
						meta.createEl("span", { text: `Due: ${fm.dueDate}` });
					}
				}

				// Add click handler to open project
				projectCard.addEventListener("click", () => {
					this.app.workspace.openLinkText(file.path, "", false);
				});
			}

		} catch (error) {
			console.error("Error rendering projects:", error);
			container.createEl("p", { text: "Error loading projects" });
		}
	}
}

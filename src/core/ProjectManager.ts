import { App, normalizePath, Notice, TFile } from 'obsidian';
import { ProjectCreationData } from '../modals/ProjectCreationModal';
import { Project, ProjectManagerSettings, ProjectStatus, TaskMetadata } from '../types';

export class ProjectManager {
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

	async createProject(projectData: Partial<Project>): Promise<TFile | null> {
		try {
			// Ensure projects folder exists
			await this.ensureProjectsFolder();

			// Generate project file name
			const fileName = this.sanitizeFileName(projectData.name ?? 'New Project');
			const filePath = normalizePath(`${this.settings.projectsFolder}/${fileName}.md`);

			// Check if file already exists
			if (this.app.vault.getAbstractFileByPath(filePath)) {
				this.showNotice(`Project "${fileName}" already exists`);
				return null;
			}

			// Create project content
			const content = this.generateProjectContent(projectData);

			// Create the file
			const file = await this.app.vault.create(filePath, content);

			if (this.settings.showNotifications) {
				this.showNotice(`Project "${fileName}" created successfully`);
			}

			return file;
		} catch (error) {
			console.error('Error creating project:', error);
			// Intentional side effect for user notification
			// eslint-disable-next-line no-new
			this.showNotice('Error creating project');
			return null;
		}
	}

	async updateProjectFromFile(file: TFile): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const cache = this.app.metadataCache.getFileCache(file);

			if (cache?.frontmatter) {
				// Update last modified
				const frontmatter = { ...cache.frontmatter };
				frontmatter.updated = new Date().toISOString().split('T')[0];

				// Regenerate content with updated frontmatter
				const newContent = this.updateFrontmatter(content, frontmatter);
				await this.app.vault.modify(file, newContent);
			}
		} catch (error) {
			console.error('Error updating project:', error);
		}
	}

	async getProjectFiles(): Promise<TFile[]> {
		return this.app.vault.getMarkdownFiles()
			.filter(file => file.path.startsWith(this.settings.projectsFolder + "/"));
	}

	async getProject(file: TFile): Promise<Project | null> {
		try {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) {
				return null;
			}

			const tasks = await this.getProjectTasks(file);

			return {
				id: file.path,
				name: cache.frontmatter.title ?? file.basename,
				description: cache.frontmatter.description ?? '',
				status: cache.frontmatter.status ?? 'Planning',
				priority: cache.frontmatter.priority ?? 'Medium',
				startDate: cache.frontmatter.startDate ?? '',
				endDate: cache.frontmatter.endDate ?? cache.frontmatter.dueDate ?? '',
				progress: cache.frontmatter.progress ?? 0,
				tags: cache.frontmatter.tags ?? [],
				assignees: cache.frontmatter.assignees ?? [],
				budget: cache.frontmatter.budget,
				actualCost: cache.frontmatter.actualCost,
				file: file,
				tasks: tasks,
				dependencies: cache.frontmatter.dependencies ?? [],
				milestones: cache.frontmatter.milestones ?? [],
				risks: cache.frontmatter.risks ?? [],
				stakeholders: cache.frontmatter.stakeholders ?? [],
				created: cache.frontmatter.created ?? new Date().toISOString(),
				updated: cache.frontmatter.updated ?? new Date().toISOString()
			};
		} catch (error) {
			console.error('Error getting project:', error);
			return null;
		}
	}

	async getProjectTasks(projectFile: TFile): Promise<TaskMetadata[]> {
		// Find tasks related to this project
		const allFiles = this.app.vault.getMarkdownFiles();
		const tasks = [];

		for (const file of allFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.projectId === projectFile.path ||
				cache?.frontmatter?.project === projectFile.basename) {
				tasks.push({
					id: file.path,
					title: cache.frontmatter.title ?? file.basename,
					status: cache.frontmatter.status ?? 'To Do',
					priority: cache.frontmatter.priority ?? 'Medium',
					dueDate: cache.frontmatter.dueDate ?? '',
					assignee: cache.frontmatter.assignee ?? '',
					progress: cache.frontmatter.progress ?? 0,
					created: cache.frontmatter.created ?? file.stat.ctime.toString(),
					updated: cache.frontmatter.updated ?? new Date().toISOString(),
					parentProject: projectFile.path,
					dependencies: cache.frontmatter.dependencies ?? [],
					tags: cache.frontmatter.tags ?? [],
					subtasks: cache.frontmatter.subtasks ?? [],
					comments: cache.frontmatter.comments ?? []
				});
			}
		}

		return tasks;
	}

	async getAllProjects(): Promise<Project[]> {
		try {
			const projectFiles = await this.getProjectFiles();
			const projects: Project[] = [];

			for (const file of projectFiles) {
				const project = await this.getProject(file);
				if (project) {
					projects.push(project);
				}
			}

			return projects;
		} catch (error) {
			console.error('Error getting all projects:', error);
			return [];
		}
	}

	private async ensureProjectsFolder(): Promise<void> {
		const folderPath = normalizePath(this.settings.projectsFolder);
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	private sanitizeFileName(name: string): string {
		return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
	}

	private generateProjectContent(projectData: Partial<Project>): string {
		const today = new Date().toISOString().split('T')[0];

		const frontmatter = {
			title: projectData.name ?? 'New Project',
			type: 'project',
			status: projectData.status ?? 'Planning',
			priority: projectData.priority ?? 'Medium',
			created: today,
			updated: today,
			startDate: projectData.startDate ?? '',
			endDate: projectData.endDate ?? '',
			progress: projectData.progress ?? 0,
			tags: projectData.tags ?? [],
			assignees: projectData.assignees ?? [],
			dependencies: projectData.dependencies ?? [],
			description: projectData.description ?? ''
		};

		let content = '---\n';
		for (const [key, value] of Object.entries(frontmatter)) {
			if (Array.isArray(value)) {
				content += `${key}:\n`;
				for (const item of value) {
					content += `  - ${item}\n`;
				}
			} else {
				content += `${key}: ${value}\n`;
			}
		}
		content += '---\n\n';

		content += `# ${projectData.name ?? 'New Project'}\n\n`;
		content += `## Overview\n\n${projectData.description ?? 'Project description...'}\n\n`;
		content += `## Objectives\n\n- [ ] Objective 1\n- [ ] Objective 2\n\n`;
		content += `## Tasks\n\n`;
		content += `## Resources\n\n`;
		content += `## Notes\n\n`;

		return content;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private updateFrontmatter(content: string, frontmatter: Record<string, unknown>): string {
		const lines = content.split('\n');
		const frontmatterEndIndex = this.findFrontmatterEndIndex(lines);

		if (frontmatterEndIndex === -1) {
			return this.addNewFrontmatter(content, frontmatter);
		}

		return this.replaceExistingFrontmatter(lines, frontmatter, frontmatterEndIndex);
	}

	private findFrontmatterEndIndex(lines: string[]): number {
		return lines.findIndex((line, index) => index > 0 && line === '---');
	}

	private addNewFrontmatter(content: string, frontmatter: Record<string, unknown>): string {
		const newFrontmatter = this.generateFrontmatterString(frontmatter);
		return newFrontmatter + content;
	}

	private replaceExistingFrontmatter(lines: string[], frontmatter: Record<string, unknown>, frontmatterEndIndex: number): string {
		const newFrontmatter = this.generateFrontmatterString(frontmatter);
		const bodyLines = lines.slice(frontmatterEndIndex + 1);
		return newFrontmatter + bodyLines.join('\n');
	}

	private generateFrontmatterString(frontmatter: Record<string, unknown>): string {
		let result = '---\n';

		for (const [key, value] of Object.entries(frontmatter)) {
			result += this.formatFrontmatterField(key, value);
		}

		result += '---\n';
		return result;
	}

	private formatFrontmatterField(key: string, value: unknown): string {
		if (Array.isArray(value)) {
			let result = `${key}:\n`;
			for (const item of value) {
				result += `  - ${item}\n`;
			}
			return result;
		} else {
			return `${key}: ${value}\n`;
		}
	}

	async createProjectFromModal(data: ProjectCreationData): Promise<TFile | null> {
		// Convert the modal data to the format expected by createProject
		const projectData = {
			name: data.name,
			description: data.description,
			type: data.type,
			status: ProjectStatus.PLANNING, // Default status for new projects
			priority: data.priority,
			startDate: data.startDate,
			endDate: data.endDate,
			tags: data.tags,
			assignees: data.assignees,
			budget: data.budget
		};

		return this.createProject(projectData);
	}
}

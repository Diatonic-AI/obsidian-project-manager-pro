import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import ProjectManagerPlugin from '../../main';

export const DASHBOARD_VIEW_TYPE = "dashboard-view";

export class DashboardView extends ItemView {
	plugin: ProjectManagerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ProjectManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return DASHBOARD_VIEW_TYPE;
	}

	getDisplayText() {
		return "Project Dashboard";
	}

	getIcon() {
		return "bar-chart";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.createEl("h2", { text: "Project Dashboard" });

		// Create dashboard widgets
		await this.renderDashboard(container);
	}

	async onClose() {
		// Nothing to clean up
	}

	async renderDashboard(container: HTMLElement) {
		const dashboard = container.createDiv("dashboard");

		// Project overview widget
		await this.renderProjectOverview(dashboard);

		// Task summary widget
		await this.renderTaskSummary(dashboard);

		// Recent activity widget
		await this.renderRecentActivity(dashboard);

		// Upcoming deadlines widget
		await this.renderUpcomingDeadlines(dashboard);
	}

	async renderProjectOverview(container: HTMLElement) {
		const widget = container.createDiv("dashboard-widget");
		widget.createEl("h3", { text: "Project Overview" });

		const projectFiles = this.app.vault.getMarkdownFiles()
			.filter(file => file.path.startsWith(this.plugin.settings.projectsFolder));

		let activeProjects = 0;
		let completedProjects = 0;
		let totalProgress = 0;

		for (const file of projectFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter) {
				const status = cache.frontmatter.status;
				if (status === 'Active' || status === 'In Progress') {
					activeProjects++;
				} else if (status === 'Completed' || status === 'Done') {
					completedProjects++;
				}

				if (cache.frontmatter.progress) {
					totalProgress += cache.frontmatter.progress;
				}
			}
		}

		const stats = widget.createDiv("project-stats");
		stats.createEl("div", { text: `Total Projects: ${projectFiles.length}` });
		stats.createEl("div", { text: `Active: ${activeProjects}` });
		stats.createEl("div", { text: `Completed: ${completedProjects}` });

		if (projectFiles.length > 0) {
			const avgProgress = Math.round(totalProgress / projectFiles.length);
			stats.createEl("div", { text: `Average Progress: ${avgProgress}%` });
		}
	}

	async renderTaskSummary(container: HTMLElement) {
		const widget = container.createDiv("dashboard-widget");
		widget.createEl("h3", { text: "Task Summary" });

		const taskFiles = this.app.vault.getMarkdownFiles()
			.filter(file => file.path.includes("task") || file.path.includes("Task"));

		let todoTasks = 0;
		let inProgressTasks = 0;
		let doneTasks = 0;
		let overdueTasks = 0;

		const today = new Date();

		for (const file of taskFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter) {
				const status = cache.frontmatter.status;
				const dueDate = cache.frontmatter.dueDate;

				if (status === 'To Do' || status === 'TODO') {
					todoTasks++;
				} else if (status === 'In Progress') {
					inProgressTasks++;
				} else if (status === 'Done' || status === 'Completed') {
					doneTasks++;
				}

				if (dueDate && new Date(dueDate) < today && status !== 'Done' && status !== 'Completed') {
					overdueTasks++;
				}
			}
		}

		const stats = widget.createDiv("task-stats");
		stats.createEl("div", { text: `To Do: ${todoTasks}` });
		stats.createEl("div", { text: `In Progress: ${inProgressTasks}` });
		stats.createEl("div", { text: `Done: ${doneTasks}` });
		stats.createEl("div", { text: `Overdue: ${overdueTasks}`, cls: "overdue" });
	}

	async renderRecentActivity(container: HTMLElement) {
		const widget = container.createDiv("dashboard-widget");
		widget.createEl("h3", { text: "Recent Activity" });

		// Get recently modified files
		const recentFiles = this.app.vault.getMarkdownFiles()
			.filter(file =>
				file.path.startsWith(this.plugin.settings.projectsFolder) ||
				file.path.includes("task") ||
				file.path.includes("Task")
			)
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, 5);

		const activityList = widget.createDiv("activity-list");

		for (const file of recentFiles) {
			const item = activityList.createDiv("activity-item");
			item.createEl("span", { text: file.basename });

			const date = new Date(file.stat.mtime);
			const timeAgo = this.getTimeAgo(date);
			item.createEl("span", { text: timeAgo, cls: "time-ago" });

			item.addEventListener("click", () => {
				this.app.workspace.openLinkText(file.path, "", false);
			});
		}
	}

	async renderUpcomingDeadlines(container: HTMLElement) {
		const widget = container.createDiv("dashboard-widget");
		widget.createEl("h3", { text: "Upcoming Deadlines" });

		const files = this.app.vault.getMarkdownFiles()
			.filter(file =>
				file.path.startsWith(this.plugin.settings.projectsFolder) ||
				file.path.includes("task") ||
				file.path.includes("Task")
			);

		const upcomingItems: Array<{file: TFile, dueDate: Date, title: string}> = [];
		const today = new Date();
		const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.dueDate) {
				const dueDate = new Date(cache.frontmatter.dueDate);
				if (dueDate >= today && dueDate <= nextWeek) {
					upcomingItems.push({
						file,
						dueDate,
						title: file.basename
					});
				}
			}
		}

		upcomingItems.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

		const deadlinesList = widget.createDiv("deadlines-list");

		if (upcomingItems.length === 0) {
			deadlinesList.createEl("p", { text: "No upcoming deadlines" });
		} else {
			for (const item of upcomingItems) {
				const deadlineItem = deadlinesList.createDiv("deadline-item");
				deadlineItem.createEl("span", { text: item.title });

				const daysUntil = Math.ceil((item.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
				deadlineItem.createEl("span", {
					text: `${daysUntil} days`,
					cls: daysUntil <= 2 ? "urgent" : "normal"
				});

				deadlineItem.addEventListener("click", () => {
					this.app.workspace.openLinkText(item.file.path, "", false);
				});
			}
		}
	}

	private getTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 60) {
			return `${diffMins}m ago`;
		} else if (diffHours < 24) {
			return `${diffHours}h ago`;
		} else {
			return `${diffDays}d ago`;
		}
	}
}

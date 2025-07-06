import { ItemView, WorkspaceLeaf } from 'obsidian';
import ProjectManagerPlugin from '../../main';

export const GANTT_VIEW_TYPE = "gantt-view";

export class GanttView extends ItemView {
	plugin: ProjectManagerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ProjectManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return GANTT_VIEW_TYPE;
	}

	getDisplayText() {
		return "Gantt Chart";
	}

	getIcon() {
		return "calendar";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h2", { text: "Gantt Chart" });

		// Create gantt chart placeholder
		const chartContainer = container.createDiv("gantt-chart");

		// For now, create a simple table representation
		await this.renderGanttTable(chartContainer);
	}

	async onClose() {
		// Nothing to clean up
	}

	async renderGanttTable(container: HTMLElement) {
		const table = container.createEl("table", { cls: "gantt-table" });
		const header = table.createEl("thead");
		const headerRow = header.createEl("tr");

		headerRow.createEl("th", { text: "Task" });
		headerRow.createEl("th", { text: "Start Date" });
		headerRow.createEl("th", { text: "End Date" });
		headerRow.createEl("th", { text: "Duration" });
		headerRow.createEl("th", { text: "Progress" });

		const tbody = table.createEl("tbody");

		// Get all project and task files
		const files = this.app.vault.getMarkdownFiles()
			.filter(file =>
				file.path.startsWith(this.plugin.settings.projectsFolder) ||
				file.path.includes("task") ||
				file.path.includes("Task")
			);

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter) {
				const fm = cache.frontmatter;
				if (fm.startDate || fm.dueDate) {
					const row = tbody.createEl("tr");

					row.createEl("td", { text: file.basename });
					row.createEl("td", { text: fm.startDate ?? "-" });
					row.createEl("td", { text: fm.dueDate ?? fm.endDate ?? "-" });

					// Calculate duration
					let duration = "-";
					if (fm.startDate && (fm.dueDate ?? fm.endDate)) {
						const start = new Date(fm.startDate);
						const end = new Date(fm.dueDate ?? fm.endDate);
						const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
						duration = `${days} days`;
					}
					row.createEl("td", { text: duration });

					const progressCell = row.createEl("td");
					const progress = fm.progress ?? 0;
					const progressBar = progressCell.createDiv("progress-bar");
					const progressFill = progressBar.createDiv("progress-fill");
					progressFill.style.width = `${progress}%`;
					progressCell.createEl("span", { text: `${progress}%` });
				}
			}
		}
	}
}

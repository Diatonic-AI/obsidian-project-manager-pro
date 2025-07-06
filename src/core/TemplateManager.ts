import { App, Notice, TFile, TFolder } from 'obsidian';
import { ProjectType, TemplateTask, WorkflowPhase, WorkflowTemplate } from '../types';

export class TemplateManager {
	private readonly app: App;
	private readonly templatesFolder: string;
	private readonly templates: Map<string, WorkflowTemplate> = new Map();

	constructor(app: App, templatesFolder: string) {
		this.app = app;
		this.templatesFolder = templatesFolder;
	}

	// Utility method for notices to satisfy linting
	private showNotice(message: string): Notice {
		return new Notice(message);
	}

	async initialize(): Promise<void> {
		await this.loadTemplates();
	}

	async loadTemplates(): Promise<void> {
		try {
			const folder = this.app.vault.getAbstractFileByPath(this.templatesFolder);
			if (!folder || !(folder instanceof TFolder)) {
				// Create templates folder if it doesn't exist
				await this.app.vault.createFolder(this.templatesFolder);
				await this.createDefaultTemplates();
				return;
			}

			const templateFiles = folder.children.filter(file =>
				file instanceof TFile && file.extension === 'md'
			) as TFile[];

			for (const file of templateFiles) {
				await this.loadTemplate(file);
			}
		} catch (error) {
			console.error('Error loading templates:', error);
			this.showNotice('Failed to load project templates');
		}
	}

	private async loadTemplate(file: TFile): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const template = this.parseTemplate(content, file.basename);
			if (template) {
				this.templates.set(template.id, template);
			}
		} catch (error) {
			console.error(`Error loading template ${file.name}:`, error);
		}
	}

	private parseTemplate(content: string, filename: string): WorkflowTemplate | null {
		try {
			// Look for YAML frontmatter
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const frontmatterMatch = frontmatterRegex.exec(content);
			if (!frontmatterMatch) {
				return null;
			}

			// Basic template structure
			const template: WorkflowTemplate = {
				id: filename.toLowerCase().replace(/\s+/g, '-'),
				name: filename,
				description: `Project template for ${filename}`,
				type: ProjectType.OTHER,
				phases: [],
				defaultTasks: [],
				metadata: {
					created: new Date().toISOString(),
					updated: new Date().toISOString(),
					author: 'System',
					version: '1.0.0',
					tags: []
				}
			};

			// Parse phases and tasks from content
			const sections = content.split(/^##\s+/m).slice(1);
			for (const section of sections) {
				const lines = section.split('\n');
				const phaseName = lines[0].trim();
				const phaseId = phaseName.toLowerCase().replace(/\s+/g, '-');

				const phase: WorkflowPhase = {
					id: phaseId,
					name: phaseName,
					description: '',
					estimatedDuration: 7, // Default 1 week
					dependencies: [],
					tasks: []
				};

				// Extract tasks from checklist items
				const taskLines = lines.filter(line => line.trim().startsWith('- [ ]'));
				for (const taskLine of taskLines) {
					const taskTitle = taskLine.replace(/^- \[ \]\s*/, '').trim();
					const taskId = `${phaseId}-${taskTitle.toLowerCase().replace(/\s+/g, '-')}`;

					const task: TemplateTask = {
						id: taskId,
						title: taskTitle,
						phase: phaseId,
						estimatedHours: 8, // Default 1 day
						dependencies: [],
						assigneeRole: 'Project Manager'
					};

					template.defaultTasks.push(task);
					phase.tasks.push(taskId);
				}

				template.phases.push(phase);
			}

			return template;
		} catch (error) {
			console.error('Error parsing template:', error);
			return null;
		}
	}

	async createDefaultTemplates(): Promise<void> {
		const defaultTemplates = [
			{
				name: 'Software Development Project',
				content: this.generateSoftwareTemplate()
			},
			{
				name: 'Research Project',
				content: this.generateResearchTemplate()
			},
			{
				name: 'Documentation Project',
				content: this.generateDocumentationTemplate()
			}
		];

		for (const template of defaultTemplates) {
			const filePath = `${this.templatesFolder}/${template.name}.md`;
			try {
				await this.app.vault.create(filePath, template.content);
			} catch (error) {
				console.error(`Error creating template ${template.name}:`, error);
			}
		}
	}

	private generateSoftwareTemplate(): string {
		return `---
type: development
priority: medium
estimatedDuration: 30
---

# Software Development Project Template

## Planning Phase
- [ ] Define project requirements
- [ ] Create technical specifications
- [ ] Design system architecture
- [ ] Set up development environment
- [ ] Create project timeline

## Development Phase
- [ ] Implement core features
- [ ] Write unit tests
- [ ] Code review and refactoring
- [ ] Integration testing
- [ ] Performance optimization

## Testing Phase
- [ ] User acceptance testing
- [ ] Security testing
- [ ] Load testing
- [ ] Bug fixes and improvements
- [ ] Final testing

## Deployment Phase
- [ ] Prepare production environment
- [ ] Deploy application
- [ ] Monitor system performance
- [ ] User training and documentation
- [ ] Project closure and retrospective
`;
	}

	private generateResearchTemplate(): string {
		return `---
type: research
priority: medium
estimatedDuration: 45
---

# Research Project Template

## Literature Review
- [ ] Identify research questions
- [ ] Conduct literature search
- [ ] Review existing studies
- [ ] Define research methodology
- [ ] Create research plan

## Data Collection
- [ ] Design data collection methods
- [ ] Gather primary data
- [ ] Collect secondary data
- [ ] Validate data quality
- [ ] Organize data for analysis

## Analysis Phase
- [ ] Perform data analysis
- [ ] Interpret results
- [ ] Identify patterns and trends
- [ ] Draw conclusions
- [ ] Validate findings

## Documentation
- [ ] Write research report
- [ ] Create presentations
- [ ] Peer review process
- [ ] Publish findings
- [ ] Archive research data
`;
	}

	private generateDocumentationTemplate(): string {
		return `---
type: documentation
priority: low
estimatedDuration: 14
---

# Documentation Project Template

## Planning
- [ ] Define documentation scope
- [ ] Identify target audience
- [ ] Create content outline
- [ ] Set up documentation structure
- [ ] Define style guidelines

## Content Creation
- [ ] Write initial drafts
- [ ] Create diagrams and visuals
- [ ] Develop examples and tutorials
- [ ] Review technical accuracy
- [ ] Edit and proofread content

## Review and Publishing
- [ ] Internal review process
- [ ] Stakeholder feedback
- [ ] Final revisions
- [ ] Format for publication
- [ ] Publish and distribute
`;
	}

	getTemplate(id: string): WorkflowTemplate | undefined {
		return this.templates.get(id);
	}

	getAllTemplates(): WorkflowTemplate[] {
		return Array.from(this.templates.values());
	}

	getTemplatesByType(type: ProjectType): WorkflowTemplate[] {
		return Array.from(this.templates.values()).filter(template => template.type === type);
	}

	async createProjectFromTemplate(templateId: string, projectName: string, projectPath: string): Promise<boolean> {
		const template = this.templates.get(templateId);
		if (!template) {
			this.showNotice(`Template ${templateId} not found`);
			return false;
		}

		try {
			const projectContent = this.generateProjectFromTemplate(template, projectName);
			await this.app.vault.create(projectPath, projectContent);
			new Notice(`Project created from template: ${template.name}`);
			return true;
		} catch (error) {
			console.error('Error creating project from template:', error);
			this.showNotice('Failed to create project from template');
			return false;
		}
	}

	private generateProjectFromTemplate(template: WorkflowTemplate, projectName: string): string {
		const frontmatter = `---
type: project
name: ${projectName}
template: ${template.id}
status: planning
priority: medium
created: ${new Date().toISOString()}
---

`;

		let content = `# ${projectName}\n\n`;
		content += `**Project Type:** ${template.type}\n`;
		content += `**Template:** ${template.name}\n\n`;
		content += `## Project Description\n\n`;
		content += `${template.description}\n\n`;

		// Add phases as sections
		for (const phase of template.phases) {
			content += `## ${phase.name}\n\n`;
			if (phase.description) {
				content += `${phase.description}\n\n`;
			}

			// Add tasks for this phase
			const phaseTasks = template.defaultTasks.filter(task => task.phase === phase.id);
			for (const task of phaseTasks) {
				content += `- [ ] ${task.title}`;
				if (task.estimatedHours) {
					content += ` (${task.estimatedHours}h)`;
				}
				content += '\n';
			}
			content += '\n';
		}

		return frontmatter + content;
	}
}

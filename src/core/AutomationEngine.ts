import { App, Notice } from 'obsidian';
import { ParameterValue, ProjectManagerSettings } from '../types';

// Type aliases for union types
export type AutomationTriggerType = 'task_created' | 'task_completed' | 'task_overdue' | 'project_started' | 'milestone_reached' | 'daily_schedule';
export type AutomationConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
export type AutomationActionType = 'send_notification' | 'create_task' | 'update_task' | 'send_email' | 'create_note' | 'update_status';

export interface AutomationRule {
	id: string;
	name: string;
	description: string;
	trigger: AutomationTrigger;
	conditions: AutomationCondition[];
	actions: AutomationAction[];
	enabled: boolean;
}

export interface AutomationTrigger {
	type: AutomationTriggerType;
	parameters?: Record<string, ParameterValue>;
}

export interface AutomationCondition {
	field: string;
	operator: AutomationConditionOperator;
	value: ParameterValue;
}

export interface AutomationAction {
	type: AutomationActionType;
	parameters: Record<string, ParameterValue>;
}

// Context type for automation
export interface AutomationContext {
	task?: {
		id: string;
		title: string;
		status: string;
		priority: string;
		dueDate?: string;
		project?: string;
	};
	project?: {
		id: string;
		name: string;
		status: string;
		priority: string;
	};
	[key: string]: string | number | boolean | object | undefined;
}

export class AutomationEngine {
	private readonly app: App;
	private readonly settings: ProjectManagerSettings;
	private readonly rules: Map<string, AutomationRule> = new Map();
	private isEnabled = true;

	constructor(app: App, settings: ProjectManagerSettings) {
		this.app = app;
		this.settings = settings;
		this.isEnabled = settings.enableAutomation;
	}

	async initialize(): Promise<void> {
		if (!this.isEnabled) return;

		await this.loadDefaultRules();
		await this.loadCustomRules();
		this.setupEventListeners();
	}

	private async loadDefaultRules(): Promise<void> {
		const defaultRules: AutomationRule[] = [
			{
				id: 'overdue-task-notification',
				name: 'Overdue Task Notification',
				description: 'Send notification when tasks become overdue',
				trigger: { type: 'daily_schedule' },
				conditions: [
					{ field: 'dueDate', operator: 'less_than', value: new Date().toISOString() },
					{ field: 'status', operator: 'not_equals', value: 'done' }
				],
				actions: [
					{
						type: 'send_notification',
						parameters: { message: 'You have overdue tasks!' }
					}
				],
				enabled: true
			},
			{
				id: 'task-completion-milestone',
				name: 'Check Milestones on Task Completion',
				description: 'Check if milestones are reached when tasks are completed',
				trigger: { type: 'task_completed' },
				conditions: [],
				actions: [
					{
						type: 'update_status',
						parameters: { type: 'milestone' }
					}
				],
				enabled: true
			},
			{
				id: 'high-priority-notification',
				name: 'High Priority Task Alert',
				description: 'Send immediate notification for high priority tasks',
				trigger: { type: 'task_created' },
				conditions: [
					{ field: 'priority', operator: 'equals', value: 'high' }
				],
				actions: [
					{
						type: 'send_notification',
						parameters: { message: 'High priority task created: {{task.title}}' }
					}
				],
				enabled: true
			}
		];

		for (const rule of defaultRules) {
			this.rules.set(rule.id, rule);
		}
	}

	private async loadCustomRules(): Promise<void> {
		// Load custom automation rules from files
		// This could be expanded to read from a dedicated automation folder
		try {
			const automationFolder = `${this.settings.projectsFolder}/Automation`;
			const folder = this.app.vault.getAbstractFileByPath(automationFolder);
			if (folder) {
				// Implementation for loading custom rules from files
				// Could use YAML or JSON format
			}
		} catch (error) {
			console.error('Error loading custom automation rules:', error);
		}
	}

	private setupEventListeners(): Promise<void> {
		// In a real implementation, this would set up listeners for various events
		// For now, we'll simulate with a daily check
		this.setupDailySchedule();
		return Promise.resolve();
	}

	private setupDailySchedule(): void {
		// Run daily automation checks
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(9, 0, 0, 0); // 9 AM next day

		const msUntilTomorrow = tomorrow.getTime() - now.getTime();

		setTimeout(() => {
			this.runDailyAutomation();
			// Set up recurring daily checks
			setInterval(() => this.runDailyAutomation(), 24 * 60 * 60 * 1000);
		}, msUntilTomorrow);
	}

	async triggerAutomation(triggerType: string, context: AutomationContext): Promise<void> {
		if (!this.isEnabled) return;

		const applicableRules = Array.from(this.rules.values()).filter(
			rule => rule.enabled && rule.trigger.type === triggerType
		);

		for (const rule of applicableRules) {
			if (await this.evaluateConditions(rule.conditions, context)) {
				await this.executeActions(rule.actions, context);
			}
		}
	}

	private async evaluateConditions(conditions: AutomationCondition[], context: AutomationContext): Promise<boolean> {
		if (conditions.length === 0) return true;

		for (const condition of conditions) {
			const fieldValue = this.getFieldValue(context, condition.field);
			if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
				return false;
			}
		}
		return true;
	}

	private getFieldValue(context: AutomationContext, field: string): ParameterValue | undefined {
		const fieldParts = field.split('.');
		let value: unknown = context;
		for (const part of fieldParts) {
			value = (value as Record<string, unknown>)?.[part];
			if (value === undefined) break;
		}
		return value as ParameterValue | undefined;
	}

	private evaluateCondition(fieldValue: ParameterValue | undefined, operator: string, conditionValue: ParameterValue): boolean {
		switch (operator) {
			case 'equals':
				return fieldValue === conditionValue;
			case 'not_equals':
				return fieldValue !== conditionValue;
			case 'contains':
				return typeof fieldValue === 'string' && typeof conditionValue === 'string' && fieldValue.includes(conditionValue);
			case 'greater_than':
				return fieldValue !== undefined && typeof fieldValue === 'number' && typeof conditionValue === 'number' && fieldValue > conditionValue;
			case 'less_than':
				return fieldValue !== undefined && typeof fieldValue === 'number' && typeof conditionValue === 'number' && fieldValue < conditionValue;
			case 'is_empty':
				return !fieldValue || (typeof fieldValue === 'string' && fieldValue.length === 0);
			case 'is_not_empty':
				return fieldValue !== undefined && fieldValue !== null && (typeof fieldValue !== 'string' || fieldValue.length > 0);
			default:
				return false;
		}
	}

	private async executeActions(actions: AutomationAction[], context: AutomationContext): Promise<void> {
		for (const action of actions) {
			try {
				await this.executeAction(action, context);
			} catch (error) {
				console.error('Error executing automation action:', error);
			}
		}
	}

	private async executeAction(action: AutomationAction, context: AutomationContext): Promise<void> {
		switch (action.type) {
			case 'send_notification':
				await this.sendNotification(action.parameters, context);
				break;
			case 'create_task':
				await this.createTask(action.parameters, context);
				break;
			case 'update_task':
				await this.updateTask(action.parameters, context);
				break;
			case 'create_note':
				await this.createNote(action.parameters, context);
				break;
			case 'update_status':
				await this.updateStatus(action.parameters, context);
				break;
			default:
				console.warn(`Unknown automation action type: ${action.type}`);
		}
	}

	private async sendNotification(parameters: Record<string, ParameterValue>, context: AutomationContext): Promise<void> {
		const message = this.interpolateString(parameters.message as string, context);
		const notice = new Notice(message);
		// Notice is intentionally created and shown to user
		console.log('Notification created for message:', message, notice);
	}

	private async createTask(parameters: Record<string, ParameterValue>, context: AutomationContext): Promise<void> {
		// Implementation for creating a new task
		const title = this.interpolateString(parameters.title as string, context);

		// This would integrate with the TaskManager to create the actual task
		console.log(`Automation: Creating task "${title}"`);
	}

	private async updateTask(parameters: Record<string, ParameterValue>, context: AutomationContext): Promise<void> {
		// Implementation for updating a task
		const taskId = parameters.taskId ?? context.task?.id;
		if (taskId) {
			console.log(`Automation: Updating task ${taskId}`);
		}
	}

	private async createNote(parameters: Record<string, ParameterValue>, context: AutomationContext): Promise<void> {
		const content = this.interpolateString(parameters.content as string, context);
		const path = this.interpolateString(parameters.path as string, context);

		try {
			await this.app.vault.create(path, content);
		} catch (error) {
			console.error('Error creating note via automation:', error);
		}
	}

	private async updateStatus(parameters: Record<string, ParameterValue>, context: AutomationContext): Promise<void> {
		// Implementation for updating project/task/milestone status
		const type = parameters.type;
		if (type === 'milestone') {
			// Check if milestone should be marked as completed
			console.log('Automation: Checking milestone completion');
		}
	}

	private interpolateString(template: string, context: AutomationContext): string {
		return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
			const value = this.getFieldValue(context, path.trim());
			return value !== undefined ? String(value) : match;
		});
	}

	private async runDailyAutomation(): Promise<void> {
		// This would be called daily to run scheduled automations
		await this.triggerAutomation('daily_schedule', {
			date: new Date().toISOString(),
			type: 'daily_check'
		});
	}

	// Public methods for managing automation rules
	addRule(rule: AutomationRule): void {
		this.rules.set(rule.id, rule);
	}

	removeRule(ruleId: string): void {
		this.rules.delete(ruleId);
	}

	enableRule(ruleId: string): void {
		const rule = this.rules.get(ruleId);
		if (rule) {
			rule.enabled = true;
		}
	}

	disableRule(ruleId: string): void {
		const rule = this.rules.get(ruleId);
		if (rule) {
			rule.enabled = false;
		}
	}

	getRules(): AutomationRule[] {
		return Array.from(this.rules.values());
	}

	getRule(ruleId: string): AutomationRule | undefined {
		return this.rules.get(ruleId);
	}

	setEnabled(enabled: boolean): void {
		this.isEnabled = enabled;
	}

	isAutomationEnabled(): boolean {
		return this.isEnabled;
	}
}

import { Notice } from 'obsidian';

export enum ErrorType {
	VALIDATION = 'validation',
	FILE_OPERATION = 'file_operation',
	NETWORK = 'network',
	PERMISSION = 'permission',
	DATA_CORRUPTION = 'data_corruption',
	TEMPLATE = 'template',
	AUTOMATION = 'automation',
	UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

export interface ErrorDetails {
	type: ErrorType;
	severity: ErrorSeverity;
	message: string;
	context?: Record<string, unknown>;
	timestamp: Date;
	userMessage?: string;
	suggestions?: string[];
	recoverable: boolean;
}

export class ProjectManagerError extends Error {
	public readonly details: ErrorDetails;

	constructor(
		message: string,
		type: ErrorType = ErrorType.UNKNOWN,
		severity: ErrorSeverity = ErrorSeverity.MEDIUM,
		context?: Record<string, unknown>,
		userMessage?: string,
		suggestions?: string[],
		recoverable = true
	) {
		super(message);
		this.name = 'ProjectManagerError';

		this.details = {
			type,
			severity,
			message,
			context,
			timestamp: new Date(),
			userMessage: userMessage ?? this.getDefaultUserMessage(type),
			suggestions: suggestions ?? this.getDefaultSuggestions(type),
			recoverable
		};
	}

	private getDefaultUserMessage(type: ErrorType): string {
		const messages = {
			[ErrorType.VALIDATION]: 'Please check your input and try again.',
			[ErrorType.FILE_OPERATION]: 'There was a problem accessing the file. Please check permissions and try again.',
			[ErrorType.NETWORK]: 'Network connection issue. Please check your connection and try again.',
			[ErrorType.PERMISSION]: 'Permission denied. Please check your access rights.',
			[ErrorType.DATA_CORRUPTION]: 'Data appears to be corrupted. Please restore from backup if available.',
			[ErrorType.TEMPLATE]: 'Template processing failed. Please check template format.',
			[ErrorType.AUTOMATION]: 'Automation rule failed to execute. Please check rule configuration.',
			[ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
		};
		return messages[type];
	}

	private getDefaultSuggestions(type: ErrorType): string[] {
		const suggestions = {
			[ErrorType.VALIDATION]: [
				'Verify all required fields are filled',
				'Check data formats and constraints',
				'Review input validation rules'
			],
			[ErrorType.FILE_OPERATION]: [
				'Check file permissions',
				'Ensure file is not locked by another application',
				'Verify disk space availability',
				'Try restarting Obsidian'
			],
			[ErrorType.NETWORK]: [
				'Check internet connection',
				'Verify proxy settings',
				'Try again in a few moments'
			],
			[ErrorType.PERMISSION]: [
				'Check user permissions',
				'Contact system administrator',
				'Verify file access rights'
			],
			[ErrorType.DATA_CORRUPTION]: [
				'Restore from recent backup',
				'Check file integrity',
				'Contact support if issue persists'
			],
			[ErrorType.TEMPLATE]: [
				'Verify template syntax',
				'Check for missing required fields',
				'Review template documentation'
			],
			[ErrorType.AUTOMATION]: [
				'Check automation rule configuration',
				'Verify trigger conditions',
				'Review automation logs'
			],
			[ErrorType.UNKNOWN]: [
				'Try restarting the plugin',
				'Check console for additional details',
				'Contact support if issue persists'
			]
		};
		return suggestions[type];
	}
}

export class ErrorHandler {
	private static instance: ErrorHandler;
	private errorLog: ErrorDetails[] = [];
	private readonly maxLogSize = 100;
	private showNotifications = true;

	private constructor() {}

	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	setNotificationEnabled(enabled: boolean): void {
		this.showNotifications = enabled;
	}

	handle(error: Error | ProjectManagerError, context?: Record<string, unknown>): void {
		let errorDetails: ErrorDetails;

		if (error instanceof ProjectManagerError) {
			errorDetails = error.details;
		} else {
			errorDetails = {
				type: ErrorType.UNKNOWN,
				severity: ErrorSeverity.MEDIUM,
				message: error.message,
				context,
				timestamp: new Date(),
				userMessage: 'An unexpected error occurred.',
				suggestions: ['Try again', 'Check console for details'],
				recoverable: true
			};
		}

		// Log the error
		this.logError(errorDetails);

		// Show user notification based on severity
		if (this.showNotifications) {
			this.showUserNotification(errorDetails);
		}

		// Log to console for debugging
		this.logToConsole(errorDetails);
	}

	private logError(errorDetails: ErrorDetails): void {
		this.errorLog.unshift(errorDetails);

		// Keep log size manageable
		if (this.errorLog.length > this.maxLogSize) {
			this.errorLog = this.errorLog.slice(0, this.maxLogSize);
		}
	}

	private showUserNotification(errorDetails: ErrorDetails): Notice {
		const { severity, userMessage, suggestions } = errorDetails;

		const noticeText = userMessage ?? 'An error occurred.';
		let finalNoticeText = noticeText;

		// Add suggestions for high severity errors
		if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
			if (suggestions && suggestions.length > 0) {
				finalNoticeText += `\n\nSuggestions:\n• ${suggestions.slice(0, 2).join('\n• ')}`;
			}
		}

		// Determine notice duration based on severity
		const duration = this.getNoticeDuration(severity);

		// Show notification to user and return the notice instance
		return new Notice(finalNoticeText, duration);
	}

	private getNoticeDuration(severity: ErrorSeverity): number {
		const durations = {
			[ErrorSeverity.LOW]: 3000,
			[ErrorSeverity.MEDIUM]: 5000,
			[ErrorSeverity.HIGH]: 8000,
			[ErrorSeverity.CRITICAL]: 0 // Persistent
		};
		return durations[severity];
	}

	private logToConsole(errorDetails: ErrorDetails): void {
		const { type, severity, message, context, timestamp } = errorDetails;

		let logMethod: 'error' | 'warn' | 'log';
		if (severity === ErrorSeverity.CRITICAL) {
			logMethod = 'error';
		} else if (severity === ErrorSeverity.HIGH) {
			logMethod = 'warn';
		} else {
			logMethod = 'log';
		}

		console[logMethod](`[ProjectManager ${severity.toUpperCase()}] ${type}: ${message}`, {
			timestamp,
			context,
			details: errorDetails
		});
	}

	getErrorLog(): ErrorDetails[] {
		return [...this.errorLog];
	}

	clearErrorLog(): void {
		this.errorLog = [];
	}

	getErrorStats(): {
		total: number;
		byType: { [key: string]: number };
		bySeverity: { [key: string]: number };
		recent: number;
	} {
		const stats = {
			total: this.errorLog.length,
			byType: {} as { [key: string]: number },
			bySeverity: {} as { [key: string]: number },
			recent: 0 // Last hour
		};

		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

		this.errorLog.forEach(error => {
			// Count by type
			stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

			// Count by severity
			stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;

			// Count recent errors
			if (error.timestamp > oneHourAgo) {
				stats.recent++;
			}
		});

		return stats;
	}
}

// Validation helper functions
export class ValidationError extends ProjectManagerError {
	constructor(message: string, field?: string, value?: unknown) {
		super(
			message,
			ErrorType.VALIDATION,
			ErrorSeverity.MEDIUM,
			{ field, value },
			`Please check the ${field ?? 'input'} field.`,
			[
				'Verify the input format',
				'Check required fields',
				'Review validation rules'
			]
		);
	}
}

export class FileOperationError extends ProjectManagerError {
	constructor(message: string, filePath?: string, operation?: string) {
		super(
			message,
			ErrorType.FILE_OPERATION,
			ErrorSeverity.HIGH,
			{ filePath, operation },
			'File operation failed. Please check permissions and try again.',
			[
				'Check file permissions',
				'Ensure file is not locked',
				'Verify disk space',
				'Try restarting Obsidian'
			]
		);
	}
}

export class TemplateError extends ProjectManagerError {
	constructor(message: string, templateName?: string, line?: number) {
		super(
			message,
			ErrorType.TEMPLATE,
			ErrorSeverity.MEDIUM,
			{ templateName, line },
			'Template processing failed. Please check template format.',
			[
				'Verify template syntax',
				'Check for missing fields',
				'Review template documentation'
			]
		);
	}
}

// Utility functions for common validation patterns
export const Validators = {
	required: (value: unknown, fieldName: string): void => {
		if (!value || (typeof value === 'string' && value.trim() === '')) {
			throw new ValidationError(`${fieldName} is required`, fieldName, value);
		}
	},

	email: (value: string, fieldName: string): void => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (value && !emailRegex.test(value)) {
			throw new ValidationError(`${fieldName} must be a valid email address`, fieldName, value);
		}
	},

	date: (value: string, fieldName: string): void => {
		if (value && isNaN(Date.parse(value))) {
			throw new ValidationError(`${fieldName} must be a valid date`, fieldName, value);
		}
	},

	number: (value: unknown, fieldName: string, min?: number, max?: number): void => {
		const num = Number(value);
		if (value !== '' && isNaN(num)) {
			throw new ValidationError(`${fieldName} must be a number`, fieldName, value);
		}
		if (min !== undefined && num < min) {
			throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, value);
		}
		if (max !== undefined && num > max) {
			throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName, value);
		}
	},

	minLength: (value: string, minLength: number, fieldName: string): void => {
		if (value && value.length < minLength) {
			throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName, value);
		}
	},

	maxLength: (value: string, maxLength: number, fieldName: string): void => {
		if (value && value.length > maxLength) {
			throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`, fieldName, value);
		}
	}
};

// Async operation wrapper with error handling
export async function safeAsync<T>(
	operation: () => Promise<T>,
	fallbackValue?: T,
	context?: Record<string, unknown>
): Promise<T | undefined> {
	try {
		return await operation();
	} catch (error) {
		ErrorHandler.getInstance().handle(error as Error, context);
		return fallbackValue;
	}
}

// Sync operation wrapper with error handling
export function safeSync<T>(
	operation: () => T,
	fallbackValue?: T,
	context?: Record<string, unknown>
): T | undefined {
	try {
		return operation();
	} catch (error) {
		ErrorHandler.getInstance().handle(error as Error, context);
		return fallbackValue;
	}
}

import { IEventProcessor } from './base-event-processor';
import { ProductEventProcessor } from './product-event-processor';
import { CustomerEventProcessor } from './customer-event-processor';
import { OrderEventProcessor } from './order-event-processor';
import { CategoryEventProcessor } from './category-event-processor';
import { 
  WebhookEventContext, 
  WebhookProcessingResult 
} from '@/shared/types/webhook.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Event processor factory for managing different entity processors
 */
export class EventProcessorFactory {
  private processors: Map<string, IEventProcessor>;
  private logger = createPlatformLogger('FACTORY', 'EventProcessorFactory');

  constructor() {
    this.processors = new Map();
    this.initializeProcessors();
  }

  /**
   * Initialize all available processors
   */
  private initializeProcessors(): void {
    try {
      // Initialize product processor
      const productProcessor = new ProductEventProcessor();
      productProcessor.getSupportedEntityTypes().forEach(entityType => {
        this.processors.set(entityType, productProcessor);
      });

      // Initialize customer processor
      const customerProcessor = new CustomerEventProcessor();
      customerProcessor.getSupportedEntityTypes().forEach(entityType => {
        this.processors.set(entityType, customerProcessor);
      });

      // Initialize order processor
      const orderProcessor = new OrderEventProcessor();
      orderProcessor.getSupportedEntityTypes().forEach(entityType => {
        this.processors.set(entityType, orderProcessor);
      });

      // Initialize category processor
      const categoryProcessor = new CategoryEventProcessor();
      categoryProcessor.getSupportedEntityTypes().forEach(entityType => {
        this.processors.set(entityType, categoryProcessor);
      });

      this.logger.info({
        entityTypes: Array.from(this.processors.keys()),
        processorCount: this.processors.size,
      }, 'Event processors initialized successfully');

    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize event processors');
      throw error;
    }
  }

  /**
   * Get processor for entity type
   */
  getProcessor(entityType: string): IEventProcessor | null {
    const processor = this.processors.get(entityType);
    
    if (!processor) {
      this.logger.warn({
        entityType,
        availableEntityTypes: Array.from(this.processors.keys()),
      }, 'No processor found for entity type');
      return null;
    }

    this.logger.debug({
      entityType,
      processorName: processor.getProcessorName(),
    }, 'Processor retrieved');

    return processor;
  }

  /**
   * Process event using appropriate processor
   */
  async processEvent(
    context: WebhookEventContext,
    payload: Record<string, any>
  ): Promise<WebhookProcessingResult> {
    const processor = this.getProcessor(context.entityType);
    
    if (!processor) {
      return {
        success: false,
        status: 'FAILED' as any,
        error: `No processor found for entity type: ${context.entityType}`,
        entityId: context.entityId,
        recordsAffected: 0,
      };
    }

    try {
      return await processor.processEvent(context, payload);
    } catch (error) {
      this.logger.error({
        error,
        entityType: context.entityType,
        webhookId: context.webhookId,
        processorName: processor.getProcessorName(),
      }, 'Event processing failed');

      return {
        success: false,
        status: 'FAILED' as any,
        error: error instanceof Error ? error.message : 'Unknown error',
        entityId: context.entityId,
        recordsAffected: 0,
      };
    }
  }

  /**
   * Get all supported entity types
   */
  getSupportedEntityTypes(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if entity type is supported
   */
  isSupported(entityType: string): boolean {
    const isSupported = this.processors.has(entityType);
    
    this.logger.debug({
      entityType,
      isSupported,
      availableEntityTypes: Array.from(this.processors.keys()),
    }, 'Entity type support check');

    return isSupported;
  }

  /**
   * Get processor information for debugging
   */
  getProcessorInfo(): Record<string, any> {
    const info: Record<string, any> = {};
    const processorsMap = new Map<string, IEventProcessor>();

    // Group entity types by processor
    for (const [entityType, processor] of this.processors) {
      if (!processorsMap.has(processor.getProcessorName())) {
        processorsMap.set(processor.getProcessorName(), processor);
      }
    }

    for (const [processorName, processor] of processorsMap) {
      info[processorName] = {
        name: processor.getProcessorName(),
        supportedEntityTypes: processor.getSupportedEntityTypes(),
        className: processor.constructor.name,
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(processor))
          .filter(name => name !== 'constructor' && typeof (processor as any)[name] === 'function'),
      };
    }

    return info;
  }

  /**
   * Validate processor implementation
   */
  validateProcessor(entityType: string): boolean {
    const processor = this.processors.get(entityType);
    
    if (!processor) {
      return false;
    }

    // Check required methods
    const requiredMethods = [
      'processEvent',
      'getSupportedEntityTypes',
      'validateEventData',
      'getProcessorName',
    ];

    for (const method of requiredMethods) {
      if (typeof (processor as any)[method] !== 'function') {
        this.logger.error({
          entityType,
          processorName: processor.getProcessorName(),
          missingMethod: method,
        }, 'Processor validation failed - missing required method');
        return false;
      }
    }

    // Check if entity type is in supported list
    if (!processor.getSupportedEntityTypes().includes(entityType)) {
      this.logger.error({
        entityType,
        processorName: processor.getProcessorName(),
        supportedEntityTypes: processor.getSupportedEntityTypes(),
      }, 'Processor validation failed - entity type not in supported list');
      return false;
    }

    this.logger.debug({
      entityType,
      processorName: processor.getProcessorName(),
    }, 'Processor validation passed');

    return true;
  }

  /**
   * Get processor statistics
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {
      totalEntityTypes: this.processors.size,
      supportedEntityTypes: Array.from(this.processors.keys()),
      processorInfo: this.getProcessorInfo(),
    };

    // Add validation status for each entity type
    stats.validationStatus = {};
    for (const entityType of this.processors.keys()) {
      stats.validationStatus[entityType] = this.validateProcessor(entityType);
    }

    // Count unique processors
    const uniqueProcessors = new Set();
    for (const processor of this.processors.values()) {
      uniqueProcessors.add(processor.getProcessorName());
    }
    stats.uniqueProcessors = uniqueProcessors.size;

    return stats;
  }

  /**
   * Get processor health check
   */
  getHealthCheck(): {
    healthy: boolean;
    processors: Record<string, { healthy: boolean; errors: string[] }>;
    summary: {
      totalEntityTypes: number;
      healthy: number;
      unhealthy: number;
    };
  } {
    const healthCheck = {
      healthy: true,
      processors: {} as Record<string, { healthy: boolean; errors: string[] }>,
      summary: {
        totalEntityTypes: this.processors.size,
        healthy: 0,
        unhealthy: 0,
      },
    };

    const checkedProcessors = new Set<string>();

    for (const [entityType, processor] of this.processors) {
      const processorName = processor.getProcessorName();
      
      // Skip if already checked this processor
      if (checkedProcessors.has(processorName)) {
        continue;
      }
      
      checkedProcessors.add(processorName);
      const errors: string[] = [];
      let processorHealthy = true;

      try {
        // Check if processor is properly initialized
        if (!processor) {
          errors.push('Processor not initialized');
          processorHealthy = false;
        }

        // Check supported entity types
        if (processor && processor.getSupportedEntityTypes().length === 0) {
          errors.push('No supported entity types');
          processorHealthy = false;
        }

        // Validate processor implementation
        if (processor && !this.validateProcessor(entityType)) {
          errors.push('Processor validation failed');
          processorHealthy = false;
        }

      } catch (error) {
        errors.push(`Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        processorHealthy = false;
      }

      healthCheck.processors[processorName] = {
        healthy: processorHealthy,
        errors,
      };

      if (processorHealthy) {
        healthCheck.summary.healthy++;
      } else {
        healthCheck.summary.unhealthy++;
        healthCheck.healthy = false;
      }
    }

    return healthCheck;
  }

  /**
   * Reload processors (useful for hot reloading in development)
   */
  reloadProcessors(): void {
    this.logger.info('Reloading event processors');
    this.processors.clear();
    this.initializeProcessors();
  }

  /**
   * Test processor with sample data
   */
  async testProcessor(
    entityType: string,
    sampleContext: WebhookEventContext,
    samplePayload: Record<string, any>
  ): Promise<{
    success: boolean;
    result?: WebhookProcessingResult;
    error?: string;
  }> {
    const processor = this.getProcessor(entityType);

    if (!processor) {
      return {
        success: false,
        error: `No processor found for entity type: ${entityType}`,
      };
    }

    try {
      const result = await processor.processEvent(sampleContext, samplePayload);
      return { success: true, result };

    } catch (error) {
      return {
        success: false,
        error: `Processor test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const eventProcessorFactory = new EventProcessorFactory();

export default EventProcessorFactory;

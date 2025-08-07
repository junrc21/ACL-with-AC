import { 
  ConflictResolutionStrategy, 
  ConflictResolutionContext 
} from '@/shared/types/webhook.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  resolved: boolean;
  strategy: ConflictResolutionStrategy;
  resolvedData?: any;
  conflictDetails: {
    totalConflicts: number;
    platforms: Platform[];
    timeSpan: number; // milliseconds between first and last update
  };
  resolutionReason: string;
  metadata?: Record<string, any>;
}

/**
 * Field merge rule
 */
export interface FieldMergeRule {
  field: string;
  strategy: 'latest' | 'priority' | 'merge' | 'custom';
  priority?: Platform[];
  customResolver?: (values: Array<{ platform: Platform; value: any; timestamp: Date }>) => any;
}

/**
 * Conflict resolution service
 */
export class ConflictResolutionService {
  private logger = createPlatformLogger('CONFLICT_RESOLUTION', 'ConflictResolutionService');

  // Platform priority for conflict resolution (higher number = higher priority)
  private platformPriority: Record<Platform, number> = {
    [Platform.WOOCOMMERCE]: 3,
    [Platform.NUVEMSHOP]: 2,
    [Platform.HOTMART]: 1,
  };

  // Entity-specific merge rules
  private entityMergeRules: Record<string, FieldMergeRule[]> = {
    product: [
      { field: 'name', strategy: 'latest' },
      { field: 'description', strategy: 'latest' },
      { field: 'price', strategy: 'priority', priority: [Platform.WOOCOMMERCE, Platform.NUVEMSHOP, Platform.HOTMART] },
      { field: 'stock', strategy: 'priority', priority: [Platform.WOOCOMMERCE, Platform.NUVEMSHOP] },
      { field: 'status', strategy: 'priority', priority: [Platform.WOOCOMMERCE, Platform.NUVEMSHOP] },
      { field: 'images', strategy: 'merge' },
      { field: 'categories', strategy: 'merge' },
    ],
    customer: [
      { field: 'email', strategy: 'latest' },
      { field: 'name', strategy: 'latest' },
      { field: 'phone', strategy: 'latest' },
      { field: 'address', strategy: 'latest' },
      { field: 'preferences', strategy: 'merge' },
      { field: 'tags', strategy: 'merge' },
    ],
    order: [
      { field: 'status', strategy: 'priority', priority: [Platform.WOOCOMMERCE, Platform.NUVEMSHOP, Platform.HOTMART] },
      { field: 'total', strategy: 'priority', priority: [Platform.WOOCOMMERCE, Platform.NUVEMSHOP, Platform.HOTMART] },
      { field: 'items', strategy: 'latest' },
      { field: 'shipping', strategy: 'latest' },
      { field: 'notes', strategy: 'merge' },
    ],
    category: [
      { field: 'name', strategy: 'latest' },
      { field: 'description', strategy: 'latest' },
      { field: 'parent_id', strategy: 'priority', priority: [Platform.WOOCOMMERCE, Platform.NUVEMSHOP] },
      { field: 'sort_order', strategy: 'priority', priority: [Platform.WOOCOMMERCE, Platform.NUVEMSHOP] },
    ],
  };

  /**
   * Resolve conflicts using specified strategy
   */
  async resolveConflict(context: ConflictResolutionContext): Promise<ConflictResolutionResult> {
    this.logger.info({
      entityType: context.entityType,
      entityId: context.entityId,
      strategy: context.strategy,
      conflictCount: context.conflictingData.length,
    }, 'Starting conflict resolution');

    try {
      const conflictDetails = this.analyzeConflict(context);
      let resolvedData: any;
      let resolutionReason: string;

      switch (context.strategy) {
        case ConflictResolutionStrategy.TIMESTAMP_WINS:
          ({ resolvedData, resolutionReason } = this.resolveByTimestamp(context));
          break;

        case ConflictResolutionStrategy.PLATFORM_PRIORITY:
          ({ resolvedData, resolutionReason } = this.resolveByPlatformPriority(context));
          break;

        case ConflictResolutionStrategy.MERGE_FIELDS:
          ({ resolvedData, resolutionReason } = this.resolveByMerging(context));
          break;

        case ConflictResolutionStrategy.MANUAL_REVIEW:
          return this.createManualReviewResult(context, conflictDetails);

        default:
          throw new Error(`Unsupported conflict resolution strategy: ${context.strategy}`);
      }

      const result: ConflictResolutionResult = {
        resolved: true,
        strategy: context.strategy,
        resolvedData,
        conflictDetails,
        resolutionReason,
        metadata: context.metadata,
      };

      this.logger.info({
        entityType: context.entityType,
        entityId: context.entityId,
        strategy: context.strategy,
        resolutionReason,
      }, 'Conflict resolved successfully');

      return result;

    } catch (error) {
      this.logger.error({
        error,
        entityType: context.entityType,
        entityId: context.entityId,
        strategy: context.strategy,
      }, 'Failed to resolve conflict');

      return {
        resolved: false,
        strategy: context.strategy,
        conflictDetails: this.analyzeConflict(context),
        resolutionReason: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: context.metadata,
      };
    }
  }

  /**
   * Resolve conflict by timestamp (most recent wins)
   */
  private resolveByTimestamp(context: ConflictResolutionContext): {
    resolvedData: any;
    resolutionReason: string;
  } {
    const sortedData = context.conflictingData.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );

    const winner = sortedData[0];
    
    return {
      resolvedData: winner.data,
      resolutionReason: `Latest update from ${winner.platform} at ${winner.timestamp.toISOString()}`,
    };
  }

  /**
   * Resolve conflict by platform priority
   */
  private resolveByPlatformPriority(context: ConflictResolutionContext): {
    resolvedData: any;
    resolutionReason: string;
  } {
    const sortedData = context.conflictingData.sort((a, b) => 
      this.platformPriority[b.platform] - this.platformPriority[a.platform]
    );

    const winner = sortedData[0];
    
    return {
      resolvedData: winner.data,
      resolutionReason: `Highest priority platform: ${winner.platform} (priority: ${this.platformPriority[winner.platform]})`,
    };
  }

  /**
   * Resolve conflict by merging fields according to rules
   */
  private resolveByMerging(context: ConflictResolutionContext): {
    resolvedData: any;
    resolutionReason: string;
  } {
    const mergeRules = this.entityMergeRules[context.entityType] || [];
    const resolvedData: any = {};
    const resolutionDetails: string[] = [];

    // Get all unique fields from all conflicting data
    const allFields = new Set<string>();
    context.conflictingData.forEach(item => {
      Object.keys(item.data).forEach(field => allFields.add(field));
    });

    for (const field of allFields) {
      const fieldValues = context.conflictingData
        .filter(item => item.data[field] !== undefined)
        .map(item => ({
          platform: item.platform,
          value: item.data[field],
          timestamp: item.timestamp,
        }));

      if (fieldValues.length === 0) continue;

      const rule = mergeRules.find(r => r.field === field);
      const resolvedValue = this.resolveField(field, fieldValues, rule);
      
      resolvedData[field] = resolvedValue.value;
      resolutionDetails.push(`${field}: ${resolvedValue.reason}`);
    }

    return {
      resolvedData,
      resolutionReason: `Field-by-field merge: ${resolutionDetails.join(', ')}`,
    };
  }

  /**
   * Resolve individual field value
   */
  private resolveField(
    field: string,
    values: Array<{ platform: Platform; value: any; timestamp: Date }>,
    rule?: FieldMergeRule
  ): { value: any; reason: string } {
    if (values.length === 1) {
      return {
        value: values[0].value,
        reason: `single value from ${values[0].platform}`,
      };
    }

    if (!rule) {
      // Default to latest timestamp
      const latest = values.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return {
        value: latest.value,
        reason: `latest (no rule defined) from ${latest.platform}`,
      };
    }

    switch (rule.strategy) {
      case 'latest':
        const latest = values.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        return {
          value: latest.value,
          reason: `latest from ${latest.platform}`,
        };

      case 'priority':
        if (rule.priority) {
          for (const platform of rule.priority) {
            const platformValue = values.find(v => v.platform === platform);
            if (platformValue) {
              return {
                value: platformValue.value,
                reason: `priority platform ${platform}`,
              };
            }
          }
        }
        // Fallback to general platform priority
        const prioritySorted = values.sort((a, b) => 
          this.platformPriority[b.platform] - this.platformPriority[a.platform]
        );
        return {
          value: prioritySorted[0].value,
          reason: `general priority ${prioritySorted[0].platform}`,
        };

      case 'merge':
        const mergedValue = this.mergeValues(values.map(v => v.value));
        return {
          value: mergedValue,
          reason: `merged from ${values.map(v => v.platform).join(', ')}`,
        };

      case 'custom':
        if (rule.customResolver) {
          const customValue = rule.customResolver(values);
          return {
            value: customValue,
            reason: `custom resolver`,
          };
        }
        // Fallback to latest
        const fallback = values.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        return {
          value: fallback.value,
          reason: `fallback to latest from ${fallback.platform}`,
        };

      default:
        const defaultLatest = values.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        return {
          value: defaultLatest.value,
          reason: `default to latest from ${defaultLatest.platform}`,
        };
    }
  }

  /**
   * Merge multiple values (for arrays and objects)
   */
  private mergeValues(values: any[]): any {
    if (values.length === 0) return null;
    if (values.length === 1) return values[0];

    const firstValue = values[0];

    // Handle arrays
    if (Array.isArray(firstValue)) {
      const merged = new Set();
      values.forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(item => merged.add(JSON.stringify(item)));
        }
      });
      return Array.from(merged).map(item => JSON.parse(item as string));
    }

    // Handle objects
    if (typeof firstValue === 'object' && firstValue !== null) {
      const merged = {};
      values.forEach(obj => {
        if (typeof obj === 'object' && obj !== null) {
          Object.assign(merged, obj);
        }
      });
      return merged;
    }

    // For primitive values, return the latest
    return values[values.length - 1];
  }

  /**
   * Analyze conflict to provide details
   */
  private analyzeConflict(context: ConflictResolutionContext): {
    totalConflicts: number;
    platforms: Platform[];
    timeSpan: number;
  } {
    const timestamps = context.conflictingData.map(item => item.timestamp.getTime());
    const platforms = context.conflictingData.map(item => item.platform);

    return {
      totalConflicts: context.conflictingData.length,
      platforms: Array.from(new Set(platforms)),
      timeSpan: Math.max(...timestamps) - Math.min(...timestamps),
    };
  }

  /**
   * Create manual review result
   */
  private createManualReviewResult(
    context: ConflictResolutionContext,
    conflictDetails: any
  ): ConflictResolutionResult {
    this.logger.warn({
      entityType: context.entityType,
      entityId: context.entityId,
      conflictDetails,
    }, 'Conflict requires manual review');

    return {
      resolved: false,
      strategy: ConflictResolutionStrategy.MANUAL_REVIEW,
      conflictDetails,
      resolutionReason: 'Conflict marked for manual review',
      metadata: {
        ...context.metadata,
        requiresManualReview: true,
        conflictingData: context.conflictingData,
      },
    };
  }

  /**
   * Update platform priority
   */
  updatePlatformPriority(platform: Platform, priority: number): void {
    this.platformPriority[platform] = priority;
    
    this.logger.info({
      platform,
      priority,
      allPriorities: this.platformPriority,
    }, 'Platform priority updated');
  }

  /**
   * Update merge rules for entity type
   */
  updateMergeRules(entityType: string, rules: FieldMergeRule[]): void {
    this.entityMergeRules[entityType] = rules;
    
    this.logger.info({
      entityType,
      rulesCount: rules.length,
    }, 'Merge rules updated');
  }

  /**
   * Get current configuration
   */
  getConfiguration(): {
    platformPriority: Record<Platform, number>;
    entityMergeRules: Record<string, FieldMergeRule[]>;
  } {
    return {
      platformPriority: { ...this.platformPriority },
      entityMergeRules: { ...this.entityMergeRules },
    };
  }

  /**
   * Get conflict resolution statistics
   */
  getStatistics(): Record<string, any> {
    return {
      platformPriority: this.platformPriority,
      entityTypes: Object.keys(this.entityMergeRules),
      totalMergeRules: Object.values(this.entityMergeRules).reduce((sum, rules) => sum + rules.length, 0),
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const conflictResolutionService = new ConflictResolutionService();

export default ConflictResolutionService;

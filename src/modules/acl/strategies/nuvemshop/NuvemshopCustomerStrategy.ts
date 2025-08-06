/**
 * Nuvemshop customer strategy implementation
 * Handles customer data from Nuvemshop customers endpoint
 */

import { CustomerStrategy } from '../base/CustomerStrategy';
import { StrategyContext } from '@/shared/types/platform.types';
import { 
  CustomerData, 
  CustomerRole, 
  CustomerStatus, 
  NuvemshopCustomerData,
  AddressType,
  CustomerAddressData,
  CustomerPhoneData,
  CustomerSpendingData
} from '@/shared/types/customer.types';
import { Platform } from '@/shared/types/platform.types';

/**
 * Nuvemshop customer strategy
 * Processes customer data from Nuvemshop customers API
 */
export class NuvemshopCustomerStrategy extends CustomerStrategy {
  /**
   * Transform Nuvemshop customer data to unified customer format
   * @param data - Nuvemshop customer data
   * @param context - Platform context
   * @returns Unified customer data
   */
  transformFromPlatform(data: any, context: StrategyContext): CustomerData {
    const customerData = data as NuvemshopCustomerData;

    // Extract name information
    const nameInfo = this.extractCustomerName(
      customerData.first_name,
      customerData.last_name,
      customerData.name
    );

    // Build customer data
    const customer: CustomerData = {
      platform: Platform.NUVEMSHOP,
      externalId: customerData.id.toString(),
      storeId: context.storeId,

      // Basic information
      email: customerData.email,
      firstName: nameInfo.firstName,
      lastName: nameInfo.lastName,
      fullName: nameInfo.fullName,
      role: CustomerRole.CUSTOMER,
      status: customerData.active !== false ? CustomerStatus.ACTIVE : CustomerStatus.INACTIVE,

      // Contact information
      phones: this.parsePhones(customerData.phone),
      addresses: this.parseAddresses(customerData.addresses, customerData.default_address),

      // Account information
      isPayingCustomer: this.isPayingCustomer(customerData),
      note: customerData.note,

      // Spending information
      spending: this.parseSpendingData(customerData),

      // Platform-specific metadata
      metadata: {
        identification: customerData.identification,
        lastOrderId: customerData.last_order_id,
        customFields: customerData.custom_fields,
        rawData: customerData,
      },

      // Timestamps
      createdAt: this.parseDate(customerData.created_at),
      updatedAt: this.parseDate(customerData.updated_at),
    };

    return customer;
  }

  /**
   * Transform unified customer data back to Nuvemshop format
   * @param customerData - Unified customer data
   * @returns Nuvemshop customer data format
   */
  transformToPlatformFormat(customerData: CustomerData): NuvemshopCustomerData {
    return {
      id: parseInt(customerData.externalId),
      email: customerData.email,
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      name: customerData.fullName,
      phone: customerData.phones?.[0]?.number,
      note: customerData.note,
      active: customerData.status === CustomerStatus.ACTIVE,
      identification: customerData.metadata?.identification,
      total_spent: customerData.spending?.totalSpent?.toString(),
      total_spent_currency: customerData.spending?.currency,
      last_order_id: customerData.metadata?.lastOrderId,
      created_at: customerData.createdAt?.toISOString(),
      updated_at: customerData.updatedAt?.toISOString(),
      custom_fields: customerData.metadata?.customFields,
      addresses: this.transformAddressesToNuvemshop(customerData.addresses),
    };
  }

  /**
   * Apply Nuvemshop-specific business rules
   * @param customerData - Customer data to modify
   */
  protected applyBusinessRules(customerData: CustomerData): void {
    // 1. Set default status if not provided
    if (!customerData.status) {
      customerData.status = CustomerStatus.ACTIVE;
    }

    // 2. Set default role
    if (!customerData.role) {
      customerData.role = CustomerRole.CUSTOMER;
    }

    // 3. Handle spending currency
    if (customerData.spending && !customerData.spending.currency) {
      customerData.spending.currency = 'USD'; // Default currency
    }

    // 4. Ensure phone numbers are normalized
    if (customerData.phones) {
      customerData.phones.forEach(phone => {
        phone.number = this.normalizePhoneNumber(phone.number);
      });
    }

    // 5. Set primary address if multiple addresses exist
    if (customerData.addresses && customerData.addresses.length > 1) {
      const hasDefault = customerData.addresses.some(addr => 
        addr.type === AddressType.BOTH || addr.type === AddressType.BILLING
      );
      
      if (!hasDefault) {
        customerData.addresses[0].type = AddressType.BOTH;
      }
    }
  }

  /**
   * Parse Nuvemshop phone data
   * @param phone - Phone string from Nuvemshop
   * @returns Array of customer phone data
   */
  private parsePhones(phone?: string): CustomerPhoneData[] | undefined {
    if (!phone) return undefined;

    return [{
      number: this.normalizePhoneNumber(phone),
      type: 'mobile',
      isPrimary: true,
    }];
  }

  /**
   * Parse Nuvemshop address data
   * @param addresses - Array of Nuvemshop addresses
   * @param defaultAddress - Default address object
   * @returns Array of customer address data
   */
  private parseAddresses(
    addresses?: any[], 
    defaultAddress?: any
  ): CustomerAddressData[] | undefined {
    const result: CustomerAddressData[] = [];

    // Parse default address first
    if (defaultAddress) {
      const address = this.parseNuvemshopAddress(defaultAddress, AddressType.BOTH);
      if (address) result.push(address);
    }

    // Parse additional addresses
    if (addresses && Array.isArray(addresses)) {
      addresses.forEach(addr => {
        // Skip if this is the same as default address
        if (defaultAddress && addr.id === defaultAddress.id) return;
        
        const address = this.parseNuvemshopAddress(addr, AddressType.SHIPPING);
        if (address) result.push(address);
      });
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Parse individual Nuvemshop address
   * @param address - Nuvemshop address object
   * @param type - Address type
   * @returns Customer address data
   */
  private parseNuvemshopAddress(address: any, type: AddressType): CustomerAddressData | null {
    if (!address || !address.address) return null;

    return {
      type,
      firstName: address.first_name,
      lastName: address.last_name,
      company: address.company,
      address1: address.address,
      address2: address.address_2,
      city: address.city,
      state: address.province,
      postalCode: address.zipcode,
      country: address.country,
      phone: address.phone,
    };
  }

  /**
   * Parse spending data from Nuvemshop customer
   * @param customerData - Nuvemshop customer data
   * @returns Customer spending data
   */
  private parseSpendingData(customerData: NuvemshopCustomerData): CustomerSpendingData | undefined {
    if (!customerData.total_spent) return undefined;

    const totalSpent = parseFloat(customerData.total_spent);
    if (isNaN(totalSpent)) return undefined;

    return {
      totalSpent,
      currency: customerData.total_spent_currency || 'USD',
      orderCount: 0, // Not provided by Nuvemshop customer endpoint
      averageOrderValue: totalSpent, // Will be calculated when we have order count
    };
  }

  /**
   * Determine if customer is a paying customer
   * @param customerData - Nuvemshop customer data
   * @returns True if customer has made purchases
   */
  private isPayingCustomer(customerData: NuvemshopCustomerData): boolean {
    if (customerData.total_spent) {
      const totalSpent = parseFloat(customerData.total_spent);
      return !isNaN(totalSpent) && totalSpent > 0;
    }
    return false;
  }

  /**
   * Transform addresses back to Nuvemshop format
   * @param addresses - Customer addresses
   * @returns Nuvemshop addresses format
   */
  private transformAddressesToNuvemshop(addresses?: CustomerAddressData[]): any[] | undefined {
    if (!addresses) return undefined;

    return addresses.map(addr => ({
      first_name: addr.firstName,
      last_name: addr.lastName,
      company: addr.company,
      address: addr.address1,
      address_2: addr.address2,
      city: addr.city,
      province: addr.state,
      zipcode: addr.postalCode,
      country: addr.country,
      phone: addr.phone,
    }));
  }
}

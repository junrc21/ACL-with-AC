/**
 * Hotmart customer strategy implementation
 * Handles customer data from Hotmart sales_users endpoint
 */

import { CustomerStrategy } from '../base/CustomerStrategy';
import { StrategyContext } from '@/shared/types/platform.types';
import { 
  CustomerData, 
  CustomerRole, 
  CustomerStatus, 
  HotmartUserData,
  AddressType,
  DocumentType,
  CustomerAddressData,
  CustomerDocumentData,
  CustomerPhoneData
} from '@/shared/types/customer.types';
import { Platform } from '@/shared/types/platform.types';

/**
 * Hotmart customer strategy
 * Processes customer data from Hotmart sales data (buyer, producer, affiliate, co_producer)
 */
export class HotmartCustomerStrategy extends CustomerStrategy {
  /**
   * Transform Hotmart user data to unified customer format
   * @param data - Hotmart user data with role context
   * @param context - Platform context
   * @returns Unified customer data
   */
  transformFromPlatform(data: any, context: StrategyContext): CustomerData {
    const { user, role: userRole } = data;
    const userData = user as HotmartUserData;

    // Extract name information
    const nameInfo = this.extractCustomerName(undefined, undefined, userData.name);

    // Build customer data
    const customerData: CustomerData = {
      platform: Platform.HOTMART,
      externalId: userData.ucode,
      storeId: context.storeId,

      // Basic information
      email: userData.email,
      firstName: nameInfo.firstName,
      lastName: nameInfo.lastName,
      fullName: nameInfo.fullName,
      role: this.mapHotmartRole(userRole),
      status: CustomerStatus.ACTIVE, // Hotmart users in sales data are active

      // Contact information
      phones: this.parsePhones(userData.phone),
      documents: this.parseDocuments(userData.documents),
      addresses: this.parseAddresses(userData.address),

      // Account information
      isPayingCustomer: userRole === 'buyer',
      isVerified: true, // Users in sales data are verified

      // Platform-specific metadata
      metadata: {
        originalRole: userRole,
        ucode: userData.ucode,
        rawData: userData,
      },

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return customerData;
  }

  /**
   * Transform unified customer data back to Hotmart format
   * @param customerData - Unified customer data
   * @returns Hotmart user data format
   */
  transformToPlatformFormat(customerData: CustomerData): HotmartUserData {
    const address = customerData.addresses?.[0];
    const phone = customerData.phones?.[0];
    const documents = customerData.documents;

    return {
      name: customerData.fullName || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
      ucode: customerData.externalId,
      email: customerData.email,
      documents: documents ? {
        cpf: documents.find(d => d.type === DocumentType.CPF)?.number,
        cnpj: documents.find(d => d.type === DocumentType.CNPJ)?.number,
        passport: documents.find(d => d.type === DocumentType.PASSPORT)?.number,
      } : undefined,
      address: address ? {
        zipcode: address.postalCode,
        address: address.address1,
        city: address.city,
        state: address.state,
        country: address.country,
        neighborhood: address.neighborhood,
        number: address.number,
        complement: address.complement,
      } : undefined,
      phone: phone ? {
        country_code: phone.countryCode,
        area_code: phone.areaCode,
        number: phone.number,
      } : undefined,
    };
  }

  /**
   * Apply Hotmart-specific business rules
   * @param customerData - Customer data to modify
   */
  protected applyBusinessRules(customerData: CustomerData): void {
    // 1. Hotmart customers are always active if they appear in sales data
    if (customerData.status !== CustomerStatus.ACTIVE) {
      customerData.status = CustomerStatus.ACTIVE;
    }

    // 2. Buyers are always paying customers
    if (customerData.role === CustomerRole.BUYER) {
      customerData.isPayingCustomer = true;
    }

    // 3. Producers and affiliates are business accounts
    if (customerData.role === CustomerRole.PRODUCER || customerData.role === CustomerRole.AFFILIATE) {
      customerData.metadata = {
        ...customerData.metadata,
        isBusinessAccount: true,
      };
    }

    // 4. Set default currency for spending data
    if (customerData.spending && !customerData.spending.currency) {
      customerData.spending.currency = 'USD';
    }
  }

  /**
   * Map Hotmart user role to customer role
   * @param role - Hotmart user role
   * @returns Customer role
   */
  private mapHotmartRole(role: string): CustomerRole {
    const roleMap: Record<string, CustomerRole> = {
      'buyer': CustomerRole.BUYER,
      'producer': CustomerRole.PRODUCER,
      'affiliate': CustomerRole.AFFILIATE,
      'co_producer': CustomerRole.CO_PRODUCER,
    };

    return roleMap[role.toLowerCase()] || CustomerRole.CUSTOMER;
  }

  /**
   * Parse Hotmart phone data
   * @param phone - Hotmart phone object
   * @returns Array of customer phone data
   */
  private parsePhones(phone?: HotmartUserData['phone']): CustomerPhoneData[] | undefined {
    if (!phone || !phone.number) return undefined;

    return [{
      countryCode: phone.country_code,
      areaCode: phone.area_code,
      number: this.normalizePhoneNumber(phone.number),
      type: 'mobile',
      isPrimary: true,
    }];
  }

  /**
   * Parse Hotmart document data
   * @param documents - Hotmart documents object
   * @returns Array of customer document data
   */
  private parseDocuments(documents?: HotmartUserData['documents']): CustomerDocumentData[] | undefined {
    if (!documents) return undefined;

    const result: CustomerDocumentData[] = [];

    if (documents.cpf) {
      result.push({
        type: DocumentType.CPF,
        number: documents.cpf,
        isVerified: true,
      });
    }

    if (documents.cnpj) {
      result.push({
        type: DocumentType.CNPJ,
        number: documents.cnpj,
        isVerified: true,
      });
    }

    if (documents.passport) {
      result.push({
        type: DocumentType.PASSPORT,
        number: documents.passport,
        isVerified: true,
      });
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Parse Hotmart address data
   * @param address - Hotmart address object
   * @returns Array of customer address data
   */
  private parseAddresses(address?: HotmartUserData['address']): CustomerAddressData[] | undefined {
    if (!address || !address.address) return undefined;

    return [{
      type: AddressType.BOTH,
      address1: address.address,
      city: address.city || '',
      state: address.state,
      postalCode: address.zipcode,
      country: address.country || 'BR', // Default to Brazil for Hotmart
      neighborhood: address.neighborhood,
      number: address.number,
      complement: address.complement,
    }];
  }
}

/**
 * WooCommerce customer strategy implementation
 * Handles customer data from WooCommerce customers endpoint
 */

import { CustomerStrategy } from '../base/CustomerStrategy';
import { StrategyContext } from '@/shared/types/platform.types';
import { 
  CustomerData, 
  CustomerRole, 
  CustomerStatus, 
  WooCommerceCustomerData,
  AddressType,
  CustomerAddressData,
  CustomerPhoneData
} from '@/shared/types/customer.types';
import { Platform } from '@/shared/types/platform.types';

/**
 * WooCommerce customer strategy
 * Processes customer data from WooCommerce customers API
 */
export class WoocommerceCustomerStrategy extends CustomerStrategy {
  /**
   * Transform WooCommerce customer data to unified customer format
   * @param data - WooCommerce customer data
   * @param context - Platform context
   * @returns Unified customer data
   */
  transformFromPlatform(data: any, context: StrategyContext): CustomerData {
    const customerData = data as WooCommerceCustomerData;

    // Extract name information
    const nameInfo = this.extractCustomerName(
      customerData.first_name,
      customerData.last_name
    );

    // Build customer data
    const customer: CustomerData = {
      platform: Platform.WOOCOMMERCE,
      externalId: customerData.id.toString(),
      storeId: context.storeId,

      // Basic information
      email: customerData.email,
      firstName: nameInfo.firstName,
      lastName: nameInfo.lastName,
      fullName: nameInfo.fullName,
      username: customerData.username,
      role: this.mapWooCommerceRole(customerData.role),
      status: CustomerStatus.ACTIVE, // WooCommerce customers are active by default

      // Contact information
      phones: this.parsePhones(customerData.billing?.phone, customerData.shipping),
      addresses: this.parseAddresses(customerData.billing, customerData.shipping),

      // Account information
      isPayingCustomer: customerData.is_paying_customer,
      avatarUrl: customerData.avatar_url,

      // Platform-specific metadata
      metadata: {
        username: customerData.username,
        role: customerData.role,
        metaData: customerData.meta_data,
        rawData: customerData,
      },

      // Timestamps
      createdAt: this.parseDate(customerData.date_created),
      updatedAt: this.parseDate(customerData.date_modified),
    };

    return customer;
  }

  /**
   * Transform unified customer data back to WooCommerce format
   * @param customerData - Unified customer data
   * @returns WooCommerce customer data format
   */
  transformToPlatformFormat(customerData: CustomerData): WooCommerceCustomerData {
    const billingAddress = customerData.addresses?.find(
      addr => addr.type === AddressType.BILLING || addr.type === AddressType.BOTH
    );
    const shippingAddress = customerData.addresses?.find(
      addr => addr.type === AddressType.SHIPPING || addr.type === AddressType.BOTH
    );

    return {
      id: parseInt(customerData.externalId),
      email: customerData.email,
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      username: customerData.username,
      role: this.reverseMapRole(customerData.role),
      billing: billingAddress ? {
        first_name: billingAddress.firstName,
        last_name: billingAddress.lastName,
        company: billingAddress.company,
        address_1: billingAddress.address1,
        address_2: billingAddress.address2,
        city: billingAddress.city,
        state: billingAddress.state,
        postcode: billingAddress.postalCode,
        country: billingAddress.country,
        email: billingAddress.email,
        phone: billingAddress.phone,
      } : undefined,
      shipping: shippingAddress ? {
        first_name: shippingAddress.firstName,
        last_name: shippingAddress.lastName,
        company: shippingAddress.company,
        address_1: shippingAddress.address1,
        address_2: shippingAddress.address2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postcode: shippingAddress.postalCode,
        country: shippingAddress.country,
      } : undefined,
      is_paying_customer: customerData.isPayingCustomer,
      avatar_url: customerData.avatarUrl,
      date_created: customerData.createdAt?.toISOString(),
      date_modified: customerData.updatedAt?.toISOString(),
      meta_data: customerData.metadata?.metaData,
    };
  }

  /**
   * Apply WooCommerce-specific business rules
   * @param customerData - Customer data to modify
   */
  protected applyBusinessRules(customerData: CustomerData): void {
    // 1. Set default status
    if (!customerData.status) {
      customerData.status = CustomerStatus.ACTIVE;
    }

    // 2. Set default role if not provided
    if (!customerData.role) {
      customerData.role = CustomerRole.CUSTOMER;
    }

    // 3. Ensure billing address exists if shipping exists
    if (customerData.addresses) {
      const hasBilling = customerData.addresses.some(
        addr => addr.type === AddressType.BILLING || addr.type === AddressType.BOTH
      );
      const hasShipping = customerData.addresses.some(
        addr => addr.type === AddressType.SHIPPING || addr.type === AddressType.BOTH
      );

      if (hasShipping && !hasBilling) {
        // Convert first shipping address to billing
        const shippingAddr = customerData.addresses.find(
          addr => addr.type === AddressType.SHIPPING
        );
        if (shippingAddr) {
          shippingAddr.type = AddressType.BOTH;
        }
      }
    }

    // 4. Normalize phone numbers
    if (customerData.phones) {
      customerData.phones.forEach(phone => {
        phone.number = this.normalizePhoneNumber(phone.number);
      });
    }

    // 5. Set username if not provided
    if (!customerData.username && customerData.email) {
      customerData.username = customerData.email.split('@')[0];
    }
  }

  /**
   * Map WooCommerce role to customer role
   * @param role - WooCommerce role
   * @returns Customer role
   */
  private mapWooCommerceRole(role?: string): CustomerRole {
    if (!role) return CustomerRole.CUSTOMER;

    const roleMap: Record<string, CustomerRole> = {
      'customer': CustomerRole.CUSTOMER,
      'subscriber': CustomerRole.SUBSCRIBER,
      'administrator': CustomerRole.ADMINISTRATOR,
      'shop_manager': CustomerRole.ADMINISTRATOR,
      'editor': CustomerRole.ADMINISTRATOR,
    };

    return roleMap[role.toLowerCase()] || CustomerRole.CUSTOMER;
  }

  /**
   * Reverse map customer role to WooCommerce role
   * @param role - Customer role
   * @returns WooCommerce role
   */
  private reverseMapRole(role: CustomerRole): string {
    const roleMap: Record<CustomerRole, string> = {
      [CustomerRole.CUSTOMER]: 'customer',
      [CustomerRole.SUBSCRIBER]: 'subscriber',
      [CustomerRole.ADMINISTRATOR]: 'administrator',
      [CustomerRole.BUYER]: 'customer',
      [CustomerRole.PRODUCER]: 'customer',
      [CustomerRole.AFFILIATE]: 'customer',
      [CustomerRole.CO_PRODUCER]: 'customer',
    };

    return roleMap[role] || 'customer';
  }

  /**
   * Parse WooCommerce phone data
   * @param billingPhone - Phone from billing address
   * @param shipping - Shipping address object
   * @returns Array of customer phone data
   */
  private parsePhones(
    billingPhone?: string, 
    shipping?: WooCommerceCustomerData['shipping']
  ): CustomerPhoneData[] | undefined {
    const phones: CustomerPhoneData[] = [];

    if (billingPhone) {
      phones.push({
        number: this.normalizePhoneNumber(billingPhone),
        type: 'mobile',
        isPrimary: true,
      });
    }

    return phones.length > 0 ? phones : undefined;
  }

  /**
   * Parse WooCommerce address data
   * @param billing - Billing address object
   * @param shipping - Shipping address object
   * @returns Array of customer address data
   */
  private parseAddresses(
    billing?: WooCommerceCustomerData['billing'],
    shipping?: WooCommerceCustomerData['shipping']
  ): CustomerAddressData[] | undefined {
    const addresses: CustomerAddressData[] = [];

    // Parse billing address
    if (billing && billing.address_1) {
      addresses.push({
        type: AddressType.BILLING,
        firstName: billing.first_name,
        lastName: billing.last_name,
        company: billing.company,
        address1: billing.address_1,
        address2: billing.address_2,
        city: billing.city || '',
        state: billing.state,
        postalCode: billing.postcode,
        country: billing.country || '',
        phone: billing.phone,
        email: billing.email,
      });
    }

    // Parse shipping address
    if (shipping && shipping.address_1) {
      // Check if shipping is different from billing
      const isDifferent = !billing || 
        shipping.address_1 !== billing.address_1 ||
        shipping.city !== billing.city ||
        shipping.postcode !== billing.postcode;

      if (isDifferent) {
        addresses.push({
          type: AddressType.SHIPPING,
          firstName: shipping.first_name,
          lastName: shipping.last_name,
          company: shipping.company,
          address1: shipping.address_1,
          address2: shipping.address_2,
          city: shipping.city || '',
          state: shipping.state,
          postalCode: shipping.postcode,
          country: shipping.country || '',
        });
      } else if (addresses.length > 0) {
        // Same as billing, mark billing as both
        addresses[0].type = AddressType.BOTH;
      }
    }

    return addresses.length > 0 ? addresses : undefined;
  }
}

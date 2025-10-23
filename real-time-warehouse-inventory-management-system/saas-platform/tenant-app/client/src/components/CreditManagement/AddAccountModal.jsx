import React, { useState } from 'react';
import { X, Save, User, Building, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { createCustomer, createSupplier } from '../../services/api';

const AddAccountModal = ({ isOpen, onClose, onAccountAdded }) => {
  const [accountType, setAccountType] = useState('customer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '', // For suppliers
    credit_limit: '', // For customers
    outstanding_balance: '0',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTypeChange = (type) => {
    setAccountType(type);
    // Reset form when changing type
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      contact_person: '',
      credit_limit: '',
      outstanding_balance: '0',
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (accountType === 'customer' && formData.credit_limit && parseFloat(formData.credit_limit) < 0) {
      newErrors.credit_limit = 'Credit limit cannot be negative';
    }

    if (formData.outstanding_balance && parseFloat(formData.outstanding_balance) < 0) {
      newErrors.outstanding_balance = 'Outstanding balance cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const accountData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        outstanding_balance: parseFloat(formData.outstanding_balance) || 0,
      };

      let response;
      if (accountType === 'customer') {
        accountData.credit_limit = parseFloat(formData.credit_limit) || 0;
        response = await createCustomer(accountData);
      } else {
        accountData.contact_person = formData.contact_person || null;
        response = await createSupplier(accountData);
      }

      if (response.success || response.customer_id || response.supplier_id) {
        onAccountAdded();
        onClose();
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          contact_person: '',
          credit_limit: '',
          outstanding_balance: '0',
        });
        setAccountType('customer');
        setErrors({});
      } else {
        setErrors({ submit: response.message || 'Failed to create account' });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setErrors({ submit: 'Failed to create account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      contact_person: '',
      credit_limit: '',
      outstanding_balance: '0',
    });
    setAccountType('customer');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Add New Account
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Account Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Account Type *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('customer')}
                className={`flex-1 p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                  accountType === 'customer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <User className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Customer</div>
                  <div className="text-sm text-gray-500">Individual or business customer</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('supplier')}
                className={`flex-1 p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                  accountType === 'supplier'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Building className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Supplier</div>
                  <div className="text-sm text-gray-500">Business supplier or vendor</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                {accountType === 'customer' ? 'Customer Name' : 'Supplier Name'} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={`Enter ${accountType} name`}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Contact Person (Suppliers only) */}
            {accountType === 'supplier' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  placeholder="Enter contact person name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Credit Limit (Customers only) */}
            {accountType === 'customer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="inline h-4 w-4 mr-1" />
                  Credit Limit (LKR)
                </label>
                <input
                  type="number"
                  name="credit_limit"
                  value={formData.credit_limit}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.credit_limit ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.credit_limit && (
                  <p className="mt-1 text-sm text-red-600">{errors.credit_limit}</p>
                )}
              </div>
            )}

            {/* Outstanding Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="inline h-4 w-4 mr-1" />
                Outstanding Balance (LKR)
              </label>
              <input
                type="number"
                name="outstanding_balance"
                value={formData.outstanding_balance}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.outstanding_balance ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.outstanding_balance && (
                <p className="mt-1 text-sm text-red-600">{errors.outstanding_balance}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              placeholder="Enter address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;

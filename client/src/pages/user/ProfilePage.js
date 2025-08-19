import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaEdit, FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerAddress,
    handleSubmit: handleSubmitAddress,
    reset: resetAddress,
    formState: { errors: addressErrors },
  } = useForm();

  // Fetch user addresses
  const { data: addresses, isLoading: addressesLoading } = useQuery(
    'userAddresses',
    async () => {
      const response = await axios.get('/api/users/addresses');
      return response.data.addresses;
    },
    {
      enabled: !!user,
    }
  );

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (data) => {
      const response = await axios.put('/api/users/profile', data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        updateUser(data.user);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  // Add address mutation
  const addAddressMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/users/addresses', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('userAddresses');
        setShowAddAddress(false);
        resetAddress();
        toast.success('Address added successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add address');
      },
    }
  );

  // Update address mutation
  const updateAddressMutation = useMutation(
    async ({ addressId, data }) => {
      const response = await axios.put(`/api/users/addresses/${addressId}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('userAddresses');
        setEditingAddressId(null);
        resetAddress();
        toast.success('Address updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update address');
      },
    }
  );

  // Delete address mutation
  const deleteAddressMutation = useMutation(
    async (addressId) => {
      await axios.delete(`/api/users/addresses/${addressId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('userAddresses');
        toast.success('Address deleted successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete address');
      },
    }
  );

  // Set default address mutation
  const setDefaultAddressMutation = useMutation(
    async (addressId) => {
      const response = await axios.patch(`/api/users/addresses/${addressId}/default`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('userAddresses');
        toast.success('Default address updated!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to set default address');
      },
    }
  );

  const onSubmitProfile = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitAddress = (data) => {
    if (editingAddressId) {
      updateAddressMutation.mutate({ addressId: editingAddressId, data });
    } else {
      addAddressMutation.mutate(data);
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address._id);
    resetAddress({
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
  };

  const handleCancelEdit = () => {
    setEditingAddressId(null);
    setShowAddAddress(false);
    resetAddress();
  };

  const provinces = [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 
    'Free State', 'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your personal information and delivery addresses
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <FaUser className="mr-2" />
                  Personal Information
                </h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn btn-sm btn-secondary"
                >
                  {isEditing ? <FaTimes /> : <FaEdit />}
                </button>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit(onSubmitProfile)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      {...register('firstName', { required: 'First name is required' })}
                      className="form-input"
                      disabled={!isEditing}
                    />
                    {errors.firstName && (
                      <p className="form-error">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      {...register('lastName', { required: 'Last name is required' })}
                      className="form-input"
                      disabled={!isEditing}
                    />
                    {errors.lastName && (
                      <p className="form-error">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label flex items-center">
                      <FaEnvelope className="mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                      className="form-input"
                      disabled={!isEditing}
                    />
                    {errors.email && (
                      <p className="form-error">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label flex items-center">
                      <FaPhone className="mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      {...register('phone', { 
                        required: 'Phone number is required',
                        pattern: {
                          value: /^(\+27|0)[6-8][0-9]{8}$/,
                          message: 'Please enter a valid South African phone number',
                        },
                      })}
                      className="form-input"
                      disabled={!isEditing}
                      placeholder="+27 82 123 4567"
                    />
                    {errors.phone && (
                      <p className="form-error">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isLoading}
                      className="btn btn-primary"
                    >
                      {updateProfileMutation.isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <FaSave className="mr-2" />
                          Save Changes
                        </div>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Account Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Account Information
              </h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Account Type
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    Customer
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Member Since
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(user?.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Wallet Balance
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    R {user?.wallet?.balance?.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Orders
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user?.orderCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="card mt-8">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FaMapMarkerAlt className="mr-2" />
                Delivery Addresses
              </h2>
              <button
                onClick={() => setShowAddAddress(true)}
                className="btn btn-primary btn-sm"
              >
                <FaPlus className="mr-1" />
                Add Address
              </button>
            </div>
          </div>
          <div className="card-body">
            {addressesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : addresses && addresses.length > 0 ? (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div
                    key={address._id}
                    className={`p-4 border-2 rounded-lg ${
                      address.isDefault
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {address.street}
                          </p>
                          {address.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {address.city}, {address.province} {address.postalCode}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {!address.isDefault && (
                          <button
                            onClick={() => setDefaultAddressMutation.mutate(address._id)}
                            className="btn btn-sm btn-secondary"
                            title="Set as default"
                          >
                            Default
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAddress(address)}
                          className="btn btn-sm btn-secondary"
                          title="Edit address"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteAddressMutation.mutate(address._id)}
                          className="btn btn-sm btn-danger"
                          title="Delete address"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaMapMarkerAlt className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No addresses found. Add your first delivery address.
                </p>
              </div>
            )}

            {/* Add/Edit Address Form */}
            {(showAddAddress || editingAddressId) && (
              <div className="mt-6 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h3>
                <form onSubmit={handleSubmitAddress(onSubmitAddress)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="form-label">Street Address</label>
                      <input
                        type="text"
                        {...registerAddress('street', { required: 'Street address is required' })}
                        className="form-input"
                        placeholder="123 Main Street"
                      />
                      {addressErrors.street && (
                        <p className="form-error">{addressErrors.street.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        {...registerAddress('city', { required: 'City is required' })}
                        className="form-input"
                        placeholder="Johannesburg"
                      />
                      {addressErrors.city && (
                        <p className="form-error">{addressErrors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Province</label>
                      <select
                        {...registerAddress('province', { required: 'Province is required' })}
                        className="form-input"
                      >
                        <option value="">Select province</option>
                        {provinces.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                      {addressErrors.province && (
                        <p className="form-error">{addressErrors.province.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Postal Code</label>
                      <input
                        type="text"
                        {...registerAddress('postalCode', { 
                          required: 'Postal code is required',
                          pattern: {
                            value: /^[0-9]{4}$/,
                            message: 'Please enter a valid 4-digit postal code',
                          },
                        })}
                        className="form-input"
                        placeholder="2000"
                        maxLength="4"
                      />
                      {addressErrors.postalCode && (
                        <p className="form-error">{addressErrors.postalCode.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...registerAddress('isDefault')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Set as default address
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addAddressMutation.isLoading || updateAddressMutation.isLoading}
                      className="btn btn-primary"
                    >
                      {(addAddressMutation.isLoading || updateAddressMutation.isLoading) ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <FaSave className="mr-2" />
                          {editingAddressId ? 'Update Address' : 'Add Address'}
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

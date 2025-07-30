// web-app/src/HelperRegistrationPage.tsx

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// IMPORTANT: Ensure this matches your backend URL
const BACKEND_URL = 'http://localhost:3000';

// Define the interface for the category data structure
interface CategoryData {
  name: string;
  description: string;
  handlerType: 'comp_sci_helpers' | 'external_stem_team' | 'ai_misc';
}

// Define the interface for the successful response from /auth/local/register-helper
interface RegisterHelperResponse {
  message: string;
  token: string;
  user: {
    _id: string;
    username: string;
    roles: string[];
    // These specific fields might be returned if they were set,
    // but the backend determines walletType based on what's provided.
    walletType?: string; // Optional, as backend infers it
    specializedCategories: string[];
    authType: 'local';
    region: 'local' | 'foreign';
    accountNumber?: string;
    accountName?: string;
    paypalEmail?: string;
    cashAppTag?: string;
    cryptoWalletAddress?: string;
    cryptoNetwork?: string;
    [key: string]: any; // Allows for additional properties not explicitly defined
  };
}

const HelperRegistrationPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  const [specializedCategories, setSpecializedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryData[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  
  const [region, setRegion] = useState<'' | 'local' | 'foreign'>('');
  
  // Local (Nigeria) payment details
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');

  // Foreign payment details
  const [foreignWalletType, setForeignWalletType] = useState<'' | 'PayPal' | 'CashApp' | 'Crypto'>('');
  const [paypalEmail, setPaypalEmail] = useState<string>('');
  const [cashAppTag, setCashAppTag] = useState<string>('');
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState<string>('');
  const [cryptoNetwork, setCryptoNetwork] = useState<'' | 'BTC' | 'USDT' | 'ETH' | 'LTC'>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('HelperRegistrationPage: Component mounted/rendered.'); // Debug log
    const fetchCategories = async () => {
      try {
        const response = await axios.get<{ categories: CategoryData[] }>(`${BACKEND_URL}/categories`);
        setAvailableCategories(response.data.categories);
      } catch (err: any) {
        console.error('Error fetching categories:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to load categories.');
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Reset specific payment fields when region or foreignWalletType changes
  useEffect(() => {
    if (region === 'local') {
      setForeignWalletType('');
      setPaypalEmail('');
      setCashAppTag('');
      setCryptoWalletAddress('');
      setCryptoNetwork('');
    } else if (region === 'foreign') {
      setAccountNumber('');
      setAccountName('');
      // Reset specific foreign wallet fields if foreignWalletType changes
      if (foreignWalletType === '') { // Only reset all if no specific foreign type is selected
        setPaypalEmail('');
        setCashAppTag('');
        setCryptoWalletAddress('');
        setCryptoNetwork('');
      } else if (foreignWalletType === 'PayPal') {
        setCashAppTag('');
        setCryptoWalletAddress('');
        setCryptoNetwork('');
      } else if (foreignWalletType === 'CashApp') {
        setPaypalEmail('');
        setCryptoWalletAddress('');
        setCryptoNetwork('');
      } else if (foreignWalletType === 'Crypto') {
        setPaypalEmail('');
        setCashAppTag('');
      }
    } else { // region is ''
      setAccountNumber('');
      setAccountName('');
      setForeignWalletType('');
      setPaypalEmail('');
      setCashAppTag('');
      setCryptoWalletAddress('');
      setCryptoNetwork('');
    }
  }, [region, foreignWalletType]);


  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setSpecializedCategories(selectedOptions);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (!region) {
      setError('Please select your region.');
      setIsSubmitting(false);
      return;
    }

    const payload: any = {
      username,
      password,
      specializedCategories,
      region,
    };

    // Conditionally add payment details based on region and wallet type
    if (region === 'local') {
      if (!accountNumber || !accountName) {
        setError('Account Number and Account Name are required for local region.');
        setIsSubmitting(false);
        return;
      }
      payload.accountNumber = accountNumber;
      payload.accountName = accountName;
      // Backend will infer walletType for local, or you can send a fixed string like:
      // payload.walletType = 'Local Bank/Mobile Money';
    } else if (region === 'foreign') {
      if (!foreignWalletType) {
        setError('Please select a foreign wallet type.');
        setIsSubmitting(false);
        return;
      }
      if (foreignWalletType === 'PayPal') {
        if (!paypalEmail) {
          setError('PayPal Email is required.');
          setIsSubmitting(false);
          return;
        }
        payload.paypalEmail = paypalEmail;
      } else if (foreignWalletType === 'CashApp') {
        if (!cashAppTag) {
          setError('CashApp Tag is required.');
          setIsSubmitting(false);
          return;
        }
        payload.cashAppTag = cashAppTag;
      } else if (foreignWalletType === 'Crypto') {
        if (!cryptoWalletAddress || !cryptoNetwork) {
          setError('Crypto Wallet Address and Network are required.');
          setIsSubmitting(false);
          return;
        }
        payload.cryptoWalletAddress = cryptoWalletAddress;
        payload.cryptoNetwork = cryptoNetwork;
      }
    }

    try {
      const response = await axios.post<RegisterHelperResponse>(`${BACKEND_URL}/auth/local/register-helper`, payload);

      if (response.status === 201) {
        setMessage(response.data.message);
        // Store the new user's token and data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        console.log('Helper registered and logged in:', response.data.user.username);
        // Redirect to the helper dashboard or main dashboard after successful registration
        navigate('/helper-dashboard');
      } else {
        setError(response.data.message || 'Registration failed.');
      }
    } catch (err: any) {
      console.error('Error during helper registration:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if the submit button should be disabled
  const isFormInvalid = () => {
    if (loadingCategories || specializedCategories.length < 3 || !region || password !== confirmPassword) {
      return true;
    }
    if (region === 'local' && (!accountNumber || !accountName)) {
      return true;
    }
    if (region === 'foreign') {
      if (!foreignWalletType) return true;
      if (foreignWalletType === 'PayPal' && !paypalEmail) return true;
      if (foreignWalletType === 'CashApp' && !cashAppTag) return true;
      if (foreignWalletType === 'Crypto' && (!cryptoWalletAddress || !cryptoNetwork)) return true;
    }
    return false;
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-discord_dark to-discord_darkest text-discord_white p-4 sm:p-6 lg:p-8">
      <div className="bg-gradient-to-br from-discord_darker to-discord_darkest p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg mx-auto border border-discord_darker transform transition-all duration-300 hover:scale-[1.01]">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-discord_green mb-6 text-center tracking-wide">
          Register as a Helper
        </h2>

        {message && (
          <div className="bg-green-600 bg-opacity-20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{message}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-600 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center mb-4">
            <p className="font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-discord_gray text-sm font-semibold mb-2">
              Username:
            </label>
            <input
              type="text"
              id="username"
              className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a unique username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-discord_gray text-sm font-semibold mb-2">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a strong password"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-discord_gray text-sm font-semibold mb-2">
              Confirm Password:
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>

          {/* Region Selection */}
          <div>
            <label htmlFor="region" className="block text-discord_gray text-sm font-semibold mb-2">
              Region:
            </label>
            <select
              id="region"
              className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker transition duration-200 ease-in-out"
              value={region}
              onChange={(e) => setRegion(e.target.value as '' | 'local' | 'foreign')}
              required
            >
              <option value="">Select Your Region</option>
              <option value="local">Local (e.g., Nigeria)</option>
              <option value="foreign">Foreign (e.g., USA, Europe)</option>
            </select>
          </div>

          {/* Dynamic Payment Fields based on Region */}
          {region === 'local' && (
            <>
              <div>
                <label htmlFor="accountNumber" className="block text-discord_gray text-sm font-semibold mb-2">
                  Account Number:
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  placeholder="Enter your account number"
                />
              </div>
              <div>
                <label htmlFor="accountName" className="block text-discord_gray text-sm font-semibold mb-2">
                  Account Name:
                </label>
                <input
                  type="text"
                  id="accountName"
                  className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  placeholder="Enter your account name"
                />
              </div>
            </>
          )}

          {region === 'foreign' && (
            <>
              <div>
                <label htmlFor="foreignWalletType" className="block text-discord_gray text-sm font-semibold mb-2">
                  Foreign Wallet Type:
                </label>
                <select
                  id="foreignWalletType"
                  className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker transition duration-200 ease-in-out"
                  value={foreignWalletType}
                  onChange={(e) => setForeignWalletType(e.target.value as '' | 'PayPal' | 'CashApp' | 'Crypto')}
                  required
                >
                  <option value="">Select wallet type</option>
                  <option value="PayPal">PayPal</option>
                  <option value="CashApp">CashApp</option>
                  <option value="Crypto">Crypto</option>
                </select>
              </div>

              {foreignWalletType === 'PayPal' && (
                <div>
                  <label htmlFor="paypalEmail" className="block text-discord_gray text-sm font-semibold mb-2">
                    PayPal Email:
                  </label>
                  <input
                    type="email"
                    id="paypalEmail"
                    className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    required
                    placeholder="Enter your PayPal email"
                  />
                </div>
              )}

              {foreignWalletType === 'CashApp' && (
                <div>
                  <label htmlFor="cashAppTag" className="block text-discord_gray text-sm font-semibold mb-2">
                    CashApp Tag:
                  </label>
                  <input
                    type="text"
                    id="cashAppTag"
                    className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                    value={cashAppTag}
                    onChange={(e) => setCashAppTag(e.target.value)}
                    required
                    placeholder="Enter your CashApp $tag (e.g., $yourtag)"
                  />
                </div>
              )}

              {foreignWalletType === 'Crypto' && (
                <>
                  <div>
                    <label htmlFor="cryptoWalletAddress" className="block text-discord_gray text-sm font-semibold mb-2">
                      Crypto Wallet Address:
                    </label>
                    <input
                      type="text"
                      id="cryptoWalletAddress"
                      className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker placeholder-gray-850 transition duration-200 ease-in-out"
                      value={cryptoWalletAddress}
                      onChange={(e) => setCryptoWalletAddress(e.target.value)}
                      required
                      placeholder="Enter your crypto wallet address"
                    />
                  </div>
                  <div>
                    <label htmlFor="cryptoNetwork" className="block text-discord_gray text-sm font-semibold mb-2">
                      Crypto Network:
                    </label>
                    <select
                      id="cryptoNetwork"
                      className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker transition duration-200 ease-in-out"
                      value={cryptoNetwork}
                      onChange={(e) => setCryptoNetwork(e.target.value as '' | 'BTC' | 'USDT' | 'ETH' | 'LTC')}
                      required
                    >
                      <option value="">Select network</option>
                      <option value="BTC">BTC</option>
                      <option value="USDT">USDT</option>
                      <option value="ETH">ETH</option>
                      <option value="LTC">LTC</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label htmlFor="specializedCategories" className="block text-discord_gray text-sm font-semibold mb-2">
              Specialized Categories (select all that apply):
            </label>
            {loadingCategories ? (
              <p className="text-discord_gray">Loading categories...</p>
            ) : availableCategories.length === 0 ? (
              <p className="text-discord_red">No categories available. Please contact admin.</p>
            ) : (
            <div className="relative">
                <select
                  id="specializedCategories"
                  multiple
                  className="shadow-inner appearance-none border border-discord_darker rounded-md w-full py-2 px-3 text-discord_white leading-tight focus:outline-none focus:ring-2 focus:ring-discord_green focus:border-transparent bg-discord_darker transition duration-200 ease-in-out h-32 custom-scroll-bar"
                  value={specializedCategories}
                  onChange={handleCategoryChange}
                  required
                >
                  {availableCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-discord_gray">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
            )}
          </div>

          {/* Register Button */}
          <button
            type="submit"
            className="bg-gradient-to-r from-discord_blurple to-indigo-600 text-discord_white px-6 py-3 rounded-md font-extrabold shadow-lg hover:from-indigo-600 hover:to-discord_blurple transition-all duration-300 w-full text-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || isFormInvalid()}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-discord_gray text-sm mt-6">
          Already have a helper account?{' '}
          <button
            onClick={() => navigate('/local-login')}
            className="text-discord_blurple hover:underline font-bold"
          >
            Login here
          </button>
        </p>
        <p className="text-center text-discord_gray text-sm mt-2">
          Are you an admin or client?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-discord_blurple hover:underline font-bold"
          >
            Go back to main login
          </button>
        </p>
      </div>
    </div>
  );
};

export default HelperRegistrationPage;

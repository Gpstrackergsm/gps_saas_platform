import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra || {};

const getLocalApiUrl = () => {
    // User preference: Always use production Railway backend
    // This ensures the iOS app on physical device sees online/production results
    return 'https://gpssaasplatform-production.up.railway.app';
}

// Production API URL with fallback
export const API_URL = __DEV__
    ? getLocalApiUrl()
    : (extra.apiUrl || 'https://gpssaasplatform-production.up.railway.app');

export const GOOGLE_MAPS_API_KEY = extra.googleMapsApiKey || 'AIzaSyBI8V98lmgxJz-NNQdF5c6sEzWkInMp0Uc';

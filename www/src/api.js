import axios from 'axios';

const { API_URL } = process.env;

export const client = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

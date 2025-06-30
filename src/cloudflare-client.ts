// src/cloudflare-client.ts
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import dotenv from 'dotenv';
import type { CloudflareResponse } from './types/cloudflare.js';





// Load environment variables from .env file
dotenv.config();

/**
 * A wrapper for the Cloudflare API.
 */
export class CloudflareClient {
  private client: AxiosInstance;
  private apiToken: string;

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    if (!this.apiToken) {
      throw new Error('CLOUDFLARE_API_TOKEN is not set in environment variables.');
    }

    const baseURL = process.env.CLOUDFLARE_API_BASE_URL || 'https://api.cloudflare.com/client/v4';

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Makes a GET request to the Cloudflare API.
   * @param path The API path to request.
   * @param params Optional query parameters.
   * @returns The API response data.
   */
  public async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.get<CloudflareResponse<T>>(path, { params });
      this.handleApiResponse(response.data);
      return response.data.result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Makes a POST request to the Cloudflare API.
   * @param path The API path to request.
   * @param data The data to send in the request body.
   * @returns The API response data.
   */
  public async post<T>(path: string, data: any): Promise<T> {
    try {
      const response = await this.client.post<CloudflareResponse<T>>(path, data);
      this.handleApiResponse(response.data);
      return response.data.result;
    } catch (error) {
      this.handleError(error);
    }
  }

    /**
   * Makes a PUT request to the Cloudflare API.
   * @param path The API path to request.
   * @param data The data to send in the request body.
   * @returns The API response data.
   */
    public async patch<T>(path: string, data: any): Promise<T> {
    try {
      const response = await this.client.patch<CloudflareResponse<T>>(path, data);
      this.handleApiResponse(response.data);
      return response.data.result;
    } catch (error) {
      this.handleError(error);
    }
  }

  public async put<T>(path: string, data: any): Promise<T> {
        try {
          const response = await this.client.put<CloudflareResponse<T>>(path, data);
          this.handleApiResponse(response.data);
          return response.data.result;
        } catch (error) {
          this.handleError(error);
        }
      }

  /**
   * Makes a DELETE request to the Cloudflare API.
   * @param path The API path to request.
   * @returns The API response data.
   */
  public async delete<T>(path: string): Promise<T> {
    try {
      const response = await this.client.delete<CloudflareResponse<T>>(path);
      this.handleApiResponse(response.data);
      return response.data.result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Checks the success flag of a Cloudflare API response and throws an error if it's false.
   * @param response The Cloudflare API response.
   */
  private handleApiResponse<T>(response: CloudflareResponse<T>): void {
    if (!response.success) {
      const errorMessages = response.errors.map((e: { code: number; message: string }) => `(Code: ${e.code}) ${e.message}`).join(', ');
      throw new Error(`Cloudflare API Error: ${errorMessages}`);
    }
  }

  /**
   * Handles errors from Axios requests, formatting them into a standard Error object.
   * @param error The error object from Axios.
   */
  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<CloudflareResponse<any>>;
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const responseData = axiosError.response.data;
        if (responseData && !responseData.success) {
            const errorMessages = responseData.errors.map((e: { code: number; message: string }) => `(Code: ${e.code}) ${e.message}`).join(', ');
            throw new Error(`Cloudflare API Error: ${errorMessages}`);
        }
        throw new Error(`HTTP Error: ${axiosError.response.status} ${axiosError.response.statusText}`);
      } else if (axiosError.request) {
        // The request was made but no response was received
        throw new Error('Network Error: No response received from Cloudflare API.');
      }
    }
    // Something happened in setting up the request that triggered an Error
    throw new Error(`Request Error: ${error.message}`);
  }
}

import axios from 'axios';
import type { HttpResponse } from '.';
import type { AxiosResponseHeaders } from "axios";
export default class Api {
    static getBaseURL() {
        return '/api/v1';
    }
    static async headers() {
        // Token is managed via Redux store and axios defaults (set in AuthProvider)
        const token = axios.defaults.headers.common['Authorization'] || '';
        return {
            'Authorization': token as string,
            'Content-Type': 'application/json'
        };
    }
    static get(route: string, params: any = {}) : Promise<HttpResponse<any>> {
        return this.xhr(route, params, 'GET');
    }
    static post(route: string, params?: any) : Promise<HttpResponse<any>> {
        return this.xhr(route, params, 'POST');
    }
    static put(route: string, params: any) : Promise<HttpResponse<any>> {
        return this.xhr(route, params, 'PUT');
    }
    static patch(route: string, params: any) : Promise<HttpResponse<any>> {
        return this.xhr(route, params, 'PATCH');
    }
    static delete(route: string, params: any) : Promise<HttpResponse<any>> {
        return this.xhr(route, params, 'DELETE');
    }
    static encodeUrlParams(url: string, params: any) {
        const queryParts: string[] = [];
      
        Object.entries(params).forEach(([key, value]: any) => {
          if (Array.isArray(value)) {
            value.forEach((val) => {
              queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
            });
          } else {
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
          }
        });
      
        return `${url}?${queryParts.join("&")}`;
      }
      
    static async xhr(route: string, params: any, verb: any) : Promise<HttpResponse<any>> {
        let url = Api.getBaseURL() + route;
        if (verb === 'GET' && params) {
            url = this.encodeUrlParams(url, params);
            params = null;
        } 
        const headers =  await Api.headers();
        let options:any;
      
        if(params && params.option && params.option.content_type){
            options = Object.assign({  validateStatus: () => {return true },method: verb, headers:headers, url: url,responseType: 'arraybuffer' as 'arraybuffer' }, params ? { data: params } : null);
        }else{
            options = Object.assign({validateStatus: () => {return true }, method: verb, headers:headers, url: url}, params ? { data: params } : null);
        }
        return axios(options).then((resp) => {
            const header = resp.headers as AxiosResponseHeaders; // Explicitly cast the headers
            if (
                resp.status === 200 ||
                resp.status === 201 ||
                resp.status === 202 ||
                resp.status === 204 ||
                resp.status === 302 ||
                resp.status === 403
            ) {
                if (
                    header["content-type"] ===
                    "application/vnd.openxmlformats-officedocument.spreadsheetml"
                ) {
                    const blob = new Blob([resp.data], {
                        type: "application/vnd.ms-excel;charset=utf-8",
                    });
                    throw new Error(`File Size ${blob.size} Saved successfully`); 
                } else {
                    return resp as HttpResponse<any>; // Ensure compatibility with your HttpResponse type
                }
            } else {
                throw resp.data.message;
            }
        }).catch((error) => {
            throw error;
        });
    }
}
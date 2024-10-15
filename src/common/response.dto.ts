export class ResponseDto<T> {
  status: string;
  message: string;
  data?: T;
  error?: any;

  constructor(status: string, message: string, data?: T, error?: any) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.error = error;
  }
}

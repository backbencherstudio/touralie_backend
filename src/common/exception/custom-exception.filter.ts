import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      console.error('🔥 [DEV ERROR LOG]:', exception);
    }
    let errorMessage: string | object = 'Internal server error';
    let extraData: Record<string, any> = {};

    if (isHttpException) {
      const exceptionResponse: any = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const { message, error, statusCode, ...rest } = exceptionResponse;
        errorMessage = message || exceptionResponse;
        extraData = rest;
      } else {
        errorMessage = exceptionResponse;
      }
    } else if (isDevelopment) {
      errorMessage =
        exception instanceof Error
          ? exception.message
          : 'Unknown Database/Server Error';
    }

    // Return custom error response format
    response.status(status).json({
      success: false,
      message: errorMessage,
      ...extraData,
    });
  }
}

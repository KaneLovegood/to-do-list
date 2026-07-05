import { TransformFnParams } from 'class-transformer';

export const trimText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const emptyToNull = ({ value }: TransformFnParams): unknown => {
  if (value === '' || value === null) {
    return null;
  }

  return value;
};

export const multipartBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

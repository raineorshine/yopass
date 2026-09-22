import { useState } from 'react';
import { randomString } from '@shared/lib/random';

export interface SecretFormState {
  oneTime: boolean;
  setOneTime: (value: boolean) => void;
  result: {
    password: string;
    uuid: string;
  };
  setResult: (result: { password: string; uuid: string }) => void;
  getPassword: () => string;
}

export function useSecretForm(): SecretFormState {
  const [oneTime, setOneTime] = useState(true);
  const [result, setResult] = useState({
    password: '',
    uuid: '',
  });

  function getPassword() {
    return randomString();
  }

  return {
    oneTime,
    setOneTime,
    result,
    setResult,
    getPassword,
  };
}

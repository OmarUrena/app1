import { AppConfig } from '../config/config';

export function developmentToken(config:AppConfig):string {
  return ['development','test'].includes(config.environment)&&Date.parse(config.developmentMfaUntil??'')>Date.now()
    ?config.developmentMfaToken??'':'';
}

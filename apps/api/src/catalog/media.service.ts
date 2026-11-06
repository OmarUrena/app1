import { Inject, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/config';
import { fetchFromServer } from '../common/server-fetch';

@Injectable()
export class MediaService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
  url(key: string): string {
    if (!this.config.supabaseUrl) throw new ServiceUnavailableException({code:'MEDIA_UNAVAILABLE'});
    return `${this.config.supabaseUrl}/storage/v1/object/public/${this.config.publicMediaBucket}/${key}`;
  }
  async verify(keys: string[]): Promise<void> {
    if (!keys.length) throw new UnprocessableEntityException({code:'PUBLICATION_REQUIREMENTS_NOT_MET'});
    await Promise.all(keys.map(async key => {
      let response: Response;
      try { response = await fetchFromServer(this.url(key), {method:'HEAD',redirect:'error',signal:AbortSignal.timeout(2000)}); }
      catch { throw new ServiceUnavailableException({code:'MEDIA_UNAVAILABLE'}); }
      if (!response.ok || !/^image\/(jpeg|png|webp|avif)(;|$)/.test(response.headers.get('content-type') ?? '')) {
        throw new UnprocessableEntityException({code:'INVALID_MEDIA'});
      }
    }));
  }
}

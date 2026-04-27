import { describe, it, expect } from 'vitest';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

describe('api-response helpers', () => {
  describe('apiSuccess', () => {
    it('returns 200 with success:true envelope', async () => {
      const res = apiSuccess({ id: '1' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual({ id: '1' });
    });

    it('includes optional message when provided', async () => {
      const res = apiSuccess({}, 'Done!');
      const json = await res.json();
      expect(json.message).toBe('Done!');
    });

    it('supports custom status codes', async () => {
      const res = apiSuccess({}, undefined, 202);
      expect(res.status).toBe(202);
    });
  });

  describe('apiCreated', () => {
    it('returns 201 with default message', async () => {
      const res = apiCreated({ id: 'new' });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.message).toBe('Created successfully');
    });
  });

  describe('apiError', () => {
    it('returns 400 with success:false envelope', async () => {
      const res = apiError('Bad input');
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Bad input');
    });

    it('includes details when provided', async () => {
      const res = apiError('Validation failed', 400, { field: 'email' });
      const json = await res.json();
      expect(json.details).toEqual({ field: 'email' });
    });
  });

  describe('apiUnauthorized', () => {
    it('returns 401', async () => {
      const res = apiUnauthorized();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('accepts custom message', async () => {
      const res = apiUnauthorized('Token expired');
      const json = await res.json();
      expect(json.error).toBe('Token expired');
    });
  });

  describe('apiForbidden', () => {
    it('returns 403', async () => {
      const res = apiForbidden();
      expect(res.status).toBe(403);
    });
  });

  describe('apiNotFound', () => {
    it('returns 404 with resource name', async () => {
      const res = apiNotFound('Course');
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Course not found');
    });
  });

  describe('apiServerError', () => {
    it('returns 500', async () => {
      const res = apiServerError();
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});

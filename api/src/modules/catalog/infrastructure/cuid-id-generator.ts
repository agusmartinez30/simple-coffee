import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { IdGenerator } from '../domain/catalog-repository.js';

/**
 * Collision-resistant ids in the shape of Prisma's `cuid()` ("c" + time + counter + random, base 36),
 * generated here so new options can be referenced (default option) before they are stored.
 */
@Injectable()
export class CuidIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter = (this.counter + 1) % 36 ** 4;
    const time = Date.now().toString(36).padStart(8, '0');
    const counter = this.counter.toString(36).padStart(4, '0');
    const random = BigInt(`0x${randomBytes(8).toString('hex')}`).toString(36).padStart(13, '0').slice(-12);
    return `c${time}${counter}${random}`;
  }
}

import { describe, expect, it } from 'vitest';
import { dataUrlToBlob } from '../downloadFile';

describe('dataUrlToBlob', () => {
  it('turns a generated PDF data URL into non-empty PDF bytes', async () => {
    const payload = btoa('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const blob = dataUrlToBlob(`data:application/pdf;base64,${payload}`);

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(20);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF');
  });
});

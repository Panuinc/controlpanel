import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { generateTOTPSecret, generateRecoveryCodes } from '@/lib/totp-utils';
import { getUserById, updateUserField } from '@/lib/user-utils';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getRequestUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getUserById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    const { secret, uri } = generateTOTPSecret(user.username);
    const qrCodeDataUrl = await QRCode.toDataURL(uri);
    const recoveryCodes = generateRecoveryCodes();

    // Store secret temporarily (not enabled yet)
    await updateUserField(user.id, 'twoFactorSecret', secret);
    await updateUserField(user.id, 'recoveryCodes', recoveryCodes);

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      recoveryCodes,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to setup 2FA' }, { status: 500 });
  }
}

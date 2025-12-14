// amplitude.ts
'use client';

import * as amplitude from '@amplitude/analytics-browser';

function initAmplitude() {
  if (typeof window !== 'undefined') {
    amplitude.init('41bde7e60fa72201652ccdfe7ee7f93b', {"autocapture":true,"serverZone":"EU"});
  }
}

initAmplitude();

export const Amplitude = () => null;
export default amplitude;
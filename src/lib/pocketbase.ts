import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:1213';
export const pb = new PocketBase(PB_URL);

pb.autoCancellation(false);

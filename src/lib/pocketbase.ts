import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://localhost:1213');

pb.autoCancellation(false);

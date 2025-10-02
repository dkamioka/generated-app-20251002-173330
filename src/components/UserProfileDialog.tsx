import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/store/userStore';
import { Separator } from '@/components/ui/separator';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}
interface GoogleJwtPayload {
  name: string;
  picture: string;
  sub: string;
}
export function UserProfileDialog({ isOpen, onClose }: UserProfileDialogProps) {
  const [name, setName] = useState('');
  const setUserProfile = useUserStore((state) => state.setUserProfile);
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setUserProfile({ name: name.trim() });
      onClose();
    }
  };
  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      setUserProfile({
        name: decoded.name,
        picture: decoded.picture,
      });
      onClose();
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && name.trim()) {
        onClose();
      }
    }}>
      <DialogContent className="bg-black border-neon-cyan text-white font-pixel sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-3xl text-glow-cyan">Welcome to KIDO</DialogTitle>
          <DialogDescription className="text-gray-400 font-mono">
            Please sign in or enter a callsign to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.error('Login Failed');
            }}
            theme="filled_black"
            text="signin_with"
            shape="pill"
          />
          <div className="flex items-center my-4 w-full">
            <Separator className="flex-1 bg-neon-cyan/20" />
            <span className="px-4 text-gray-400 font-mono text-sm">OR</span>
            <Separator className="flex-1 bg-neon-cyan/20" />
          </div>
          <form onSubmit={handleGuestSubmit} className="w-full">
            <div className="grid gap-4">
              <Input
                id="userName"
                placeholder="ENTER GUEST CALLSIGN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-900/50 border-neon-magenta text-neon-magenta focus:ring-neon-magenta focus:ring-2 text-center"
                maxLength={12}
                required
              />
            </div>
            <DialogFooter className="mt-4">
              <button type="submit" className="retro-btn w-full">
                Enter as Guest
              </button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
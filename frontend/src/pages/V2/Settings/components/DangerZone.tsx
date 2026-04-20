import { Trash2Icon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const DangerZone = () => {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Danger Zone</h3>
        <p className="text-muted-foreground text-sm">
          Delete your account permanently. This action will remove all your data and cannot be undone.{' '}
          <a href="#" className="text-card-foreground font-medium hover:underline">
            Learn more
          </a>
        </p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 max-lg:flex-col">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Delete account</h3>
                <p className="text-muted-foreground text-sm">
                  Delete your account permanently. This action will remove all your data and cannot be undone.
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                  >
                    <Trash2Icon />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md pt-10 text-center">
                  <DialogHeader className="space-y-2">
                    <DialogTitle className="text-center text-xl">Delete account</DialogTitle>
                    <div className="text-muted-foreground text-sm">
                      Delete your account permanently. This action will remove all your data and cannot be undone.
                    </div>
                  </DialogHeader>
                  <DialogFooter className="mt-6 gap-2 sm:justify-center">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="destructive">Delete</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DangerZone;

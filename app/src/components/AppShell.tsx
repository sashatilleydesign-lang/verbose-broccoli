import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { QuickJump } from "@/components/QuickJump";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { TaskNoteModal } from "@/components/TaskNoteModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">{children}</main>
      </div>
      <QuickJump />
      <ReminderWatcher />
      <TaskNoteModal />
    </div>
  );
}

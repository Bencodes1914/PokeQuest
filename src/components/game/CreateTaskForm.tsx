"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useGameState } from "@/hooks/use-game-state";
import type { Task, Difficulty } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(3, "Task name must be at least 3 characters long."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  isTimeLocked: z.boolean(),
  duration: z.coerce.number().int().min(0).optional(),
}).refine(data => !data.isTimeLocked || (data.duration && data.duration > 0), {
    message: "Duration is required for time-locked tasks.",
    path: ["duration"],
});

interface CreateTaskFormProps {
  onTaskCreated: () => void;
}

export function CreateTaskForm({ onTaskCreated }: CreateTaskFormProps) {
  const { setGameState } = useGameState();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      difficulty: "Easy",
      isTimeLocked: false,
      duration: 0,
    },
  });

  const isTimeLocked = form.watch("isTimeLocked");

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: values.name,
      difficulty: values.difficulty as Difficulty,
      isTimeLocked: values.isTimeLocked,
      duration: values.isTimeLocked ? values.duration! : 0,
      completed: false,
    };

    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: [...prev.tasks, newTask],
      };
    });
    
    onTaskCreated();
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Battle a rival" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isTimeLocked"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel>Time-Locked Task</FormLabel>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    />
                </FormControl>
            </FormItem>
          )}
        />

        {isTimeLocked && (
            <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Duration (in seconds)</Form.Label>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}


        <Button type="submit" className="w-full">Create Task</Button>
      </form>
    </Form>
  );
}

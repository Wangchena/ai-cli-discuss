import { Message, MessageType } from './types';

type MessageCallback = (message: Message) => void;

export class MessageBus {
  private messages: Map<string, Message[]> = new Map();
  private subscribers: Map<string, Set<MessageCallback>> = new Map();

  publish(message: Message): void {
    const taskMessages = this.messages.get(message.taskId) || [];
    taskMessages.push(message);
    this.messages.set(message.taskId, taskMessages);

    const taskSubscribers = this.subscribers.get(message.taskId);
    if (taskSubscribers) {
      taskSubscribers.forEach((cb) => cb(message));
    }
  }

  getMessages(taskId: string): Message[] {
    const msgs = this.messages.get(taskId);
    if (!msgs) return [];
    return [...msgs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getMessagesByType(taskId: string, type: MessageType): Message[] {
    return this.getMessages(taskId).filter((m) => m.type === type);
  }

  subscribe(taskId: string, callback: MessageCallback): () => void {
    if (!this.subscribers.has(taskId)) {
      this.subscribers.set(taskId, new Set());
    }
    this.subscribers.get(taskId)!.add(callback);

    return () => {
      this.subscribers.get(taskId)?.delete(callback);
    };
  }

  clearTask(taskId: string): void {
    this.messages.delete(taskId);
    this.subscribers.delete(taskId);
  }
}

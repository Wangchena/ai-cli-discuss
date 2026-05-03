import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageBus } from '../src/message-bus';
import { Message } from '../src/types';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  it('should publish and retrieve messages for a task', () => {
    const msg: Message = {
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'My plan',
      timestamp: new Date(),
    };

    bus.publish(msg);
    const messages = bus.getMessages('task-1');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(msg);
  });

  it('should scope messages to their task', () => {
    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Plan A',
      timestamp: new Date(),
    });
    bus.publish({
      id: 'msg-2',
      taskId: 'task-2',
      fromNode: 'node-b',
      type: 'proposal',
      content: 'Plan B',
      timestamp: new Date(),
    });

    expect(bus.getMessages('task-1')).toHaveLength(1);
    expect(bus.getMessages('task-2')).toHaveLength(1);
    expect(bus.getMessages('task-1')[0].id).toBe('msg-1');
  });

  it('should notify subscribers when a message is published', () => {
    const callback = vi.fn();
    bus.subscribe('task-1', callback);

    const msg: Message = {
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Test',
      timestamp: new Date(),
    };

    bus.publish(msg);
    expect(callback).toHaveBeenCalledWith(msg);
  });

  it('should not notify subscribers of other tasks', () => {
    const callback = vi.fn();
    bus.subscribe('task-1', callback);

    bus.publish({
      id: 'msg-1',
      taskId: 'task-2',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Test',
      timestamp: new Date(),
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should return messages in chronological order', () => {
    const base = new Date('2026-01-01');
    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'First',
      timestamp: new Date(base.getTime() + 1000),
    });
    bus.publish({
      id: 'msg-2',
      taskId: 'task-1',
      fromNode: 'node-b',
      type: 'proposal',
      content: 'Second',
      timestamp: new Date(base.getTime() + 2000),
    });

    const messages = bus.getMessages('task-1');
    expect(messages[0].content).toBe('First');
    expect(messages[1].content).toBe('Second');
  });

  it('should unsubscribe listeners', () => {
    const callback = vi.fn();
    const unsubscribe = bus.subscribe('task-1', callback);
    unsubscribe();

    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Test',
      timestamp: new Date(),
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should retrieve messages by type', () => {
    const base = new Date();
    bus.publish({
      id: 'msg-1',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'proposal',
      content: 'Proposal',
      timestamp: new Date(base.getTime()),
    });
    bus.publish({
      id: 'msg-2',
      taskId: 'task-1',
      fromNode: 'node-b',
      type: 'comment',
      content: 'Comment',
      timestamp: new Date(base.getTime() + 1000),
    });
    bus.publish({
      id: 'msg-3',
      taskId: 'task-1',
      fromNode: 'node-a',
      type: 'vote',
      content: 'msg-1',
      timestamp: new Date(base.getTime() + 2000),
    });

    expect(bus.getMessagesByType('task-1', 'proposal')).toHaveLength(1);
    expect(bus.getMessagesByType('task-1', 'comment')).toHaveLength(1);
    expect(bus.getMessagesByType('task-1', 'vote')).toHaveLength(1);
  });
});

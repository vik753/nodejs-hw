import { model, Schema } from 'mongoose';
import { TAGS } from '../constants/tags.js';

const notesSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    tag: {
      type: String,
      required: false,
      default: 'Todo',
      enum: TAGS,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notesSchema.index(
  { title: 'text', content: 'text' },
  { weights: { title: 10, content: 5 } },
);

export const Note = model('Note', notesSchema);

import { Note } from '../models/note.js';
import createHttpError from 'http-errors';

export const getAllNotes = async (req, res) => {
  const { page, perPage, search, tag } = req.query;
  // calculate the skip value based on the page and perPage query parameters
  const skip = (page - 1) * perPage;
  // create the base query
  const notesQuery = Note.find();
  // if a tag query is provided, apply it to the query
  if (tag) {
    notesQuery.where({ tag });
  }
  // if a search query is provided, apply it to the query
  if (search) {
    notesQuery.where({ $text: { $search: search } });
  }
  // send two queries: one for the total number of items
  // and one for the actual notes for the current page
  const [totalNotes, notes] = await Promise.all([
    notesQuery.clone().countDocuments(),
    notesQuery.skip(skip).limit(perPage),
  ]);
  // calculate the total number of pages
  const totalPages = Math.ceil(totalNotes / perPage);

  res.status(200).json({ notes, page, perPage, totalNotes, totalPages });
};

export const getNoteById = async (req, res) => {
  const { noteId } = req.params;
  const note = await Note.findById(noteId);
  if (!note) {
    throw createHttpError(404, 'Note not found');
  }
  res.status(200).json(note);
};

export const createNote = async (req, res) => {
  const note = await Note.create(req.body);
  res.status(201).json(note);
};

export const deleteNote = async (req, res) => {
  const { noteId } = req.params;
  const note = await Note.findOneAndDelete({ _id: noteId });
  if (!note) {
    throw createHttpError(404, 'Note not found');
  }
  res.status(200).json(note);
};

export const updateNote = async (req, res) => {
  const { noteId } = req.params;
  const updatedNote = await Note.findOneAndUpdate({ _id: noteId }, req.body, {
    returnDocument: 'after',
  });
  if (!updatedNote) {
    throw createHttpError(404, 'Note not found');
  }
  res.status(200).json(updatedNote);
};

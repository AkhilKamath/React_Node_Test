const MeetingHistory = require('../../model/schema/meeting')
const mongoose = require('mongoose');

const add = async (req, res) => {
   try {
    const meeting = new MeetingHistory(req.body);
    await meeting.save();
    res.status(200).json(meeting);
   } catch (err) {
    console.error('Failed to create Meeting:', err);
    res.status(400).json({ error: 'Failed to create Meeting' });
   }
}

const index = async (req, res) => {
    const query = { ...req.query, deleted: false };

    let allData = await MeetingHistory.aggregate([
        {
            $match: query
        },
        {
            $lookup: {
                from: 'User',
                localField: 'createBy',
                foreignField: '_id',
                as: 'createByDetails'
            }
        },
        {
            $unwind: {
                path: '$createByDetails',
                preserveNullAndEmptyArrays: false // exclude documents where the 'createByDetails' field is null
            }
        },
        {
            $match: { 'createByDetails.deleted': false }
        },
        {
            $addFields: {
                createdByName: {
                    $concat: ['$createByDetails.firstName', ' ', '$createByDetails.lastName']
                }
            }
        },
        {
            $project: {
                'createByDetails': 0
            }
        }
    ]);

    try {
        res.send(allData);
    } catch (error) {
        res.send(error);
    }
}

const view = async (req, res) => {
    try {
        let meeting = await MeetingHistory.aggregate([
            {
                $match: { 
                    _id: new mongoose.Types.ObjectId(req.params.id), // match the meeting by its ID
                    deleted: false
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'createByDetails'
                }
            },
            {
                $unwind: {
                    path: '$createByDetails',
                    preserveNullAndEmptyArrays: false // exclude documents where the 'createByDetails' field is null
                }
            },
            {
                $match: { 'createByDetails.deleted': false } // filter out deleted users
            },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendes'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLead'
                }
            },
            {
                $addFields: {
                    createdByName: {
                        $concat: ['$createByDetails.firstName', ' ', '$createByDetails.lastName'] // Combine firstName and lastName
                    }
                }
            },
            {
                $project: {
                    'createByDetails': 0
                }
            }
        ]);

        if (!meeting.length) {
            return res.status(404).json({ message: 'Meeting not found.' });
        }

        res.status(200).json(meeting[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, err: 'An error occurred while viewing meeting.' });
    }
}

const deleteData = async (req, res) => {
  try {
    const meeting = await MeetingHistory.findByIdAndUpdate(req.params.id, { deleted: true });
    res.status(200).json({ message: "done", meeting });
  } catch(err) {
    res.status(400).json({ message: 'error', err });
  }
}

const deleteMany = async (req, res) => {
    try {
        const meeting = await MeetingHistory.updateMany({ _id: { $in: req.body } }, { $set: { deleted: true } });
        res.status(200).json({ message: "done", meeting });
    } catch (err) {
        res.status(400).json({ message: 'error', err });
    }
}

module.exports = { add, index, view, deleteData, deleteMany }
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
    const query = req.query
    query.deleted = false;

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
            $unwind: '$createByDetails'
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

    const result = allData.filter(item => item.createBy !== null);
    try {
        res.send(result)
    } catch (error) {
        res.send(error)
    }
}

const view = async (req, res) => {
    try {
        let meeting = await MeetingHistory.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(req.params.id) } // match the meeting by its ID
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
                $unwind: '$createByDetails'
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
                    },
                    // 'attendes': {
                    //     $map: {
                    //         input: '$attendes', // Map over the 'attendes' array
                    //         as: 'attendee',
                    //         in: {
                    //             _id: '$$attendee._id',
                    //             firstName: { $arrayElemAt: [{ $split: ['$$attendee.fullName', ' '] }, 0] }, // Get the first part as firstName
                    //             lastName: {  $ifNull: [
                    //                 { $arrayElemAt: [{ $split: ['$$attendee.fullName', ' '] }, 1] }, // Get the second part as lastName
                    //                 '' // Default value
                    //             ] }
                    //         }
                    //     }
                    // },
                }
            },
            {
                $project: {
                    'createByDetails': 0 // remove the 'createByDetails' field from the result
                }
            }
        ]);

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
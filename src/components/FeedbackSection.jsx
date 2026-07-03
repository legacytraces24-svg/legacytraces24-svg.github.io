import React, { useState, useEffect } from 'react';
import { fetchProductFeedback, fetchProductRating, postComment, postRating, interactComment } from '../api/api';
import { useUser } from '../context/UserContext';
import { Star, ThumbsUp, ThumbsDown, Reply, MessageSquare, Send } from 'lucide-react';

// Masks email addresses for public display.
// If it looks like an email, shows only the part before @, with
// special characters replaced by spaces and words capitalized.
// e.g. "john_doe123@gmail.com" → "John Doe 123"
function maskUserId(userId) {
    if (!userId) return 'Anonymous';
    if (!userId.includes('@')) return userId;
    const local = userId.split('@')[0];
    return local
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .replace(/([a-z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || 'User';
}

const FeedbackSection = ({ productId }) => {
    const [feedback, setFeedback] = useState([]);
    const [rating, setRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [loading, setLoading] = useState(true);
    
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState(null); // commentId
    const [replyText, setReplyText] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const { user } = useUser();
    
    // Auto-populate from context if available
    const [userName, setUserName] = useState(user?.name || '');
    const [phoneNo, setPhoneNo] = useState(user?.phone || '');

    useEffect(() => {
        if (user) {
            setUserName(prev => prev || user.name || '');
            setPhoneNo(prev => prev || user.phone || '');
        }
    }, [user]);

    useEffect(() => {
        loadFeedbackAndRating();
    }, [productId]);

    const loadFeedbackAndRating = async () => {
        setLoading(true);
        try {
            const [fbData, ratingData] = await Promise.all([
                fetchProductFeedback(productId),
                fetchProductRating(productId)
            ]);
            setFeedback(fbData);
            if (ratingData) {
                setAverageRating(ratingData.averageRating || 0);
                setTotalRatings(ratingData.totalRatings || 0);
            }
        } catch { /* silent */ }

        setLoading(false);
    };

    const handleRating = async (rate) => {
        if (!user?.idToken) return; // must be authenticated
        setRating(rate);
        try {
            await postRating({ idToken: user.idToken, productId, rating: rate });
            const ratingData = await fetchProductRating(productId);
            if (ratingData) {
                setAverageRating(ratingData.averageRating || 0);
                setTotalRatings(ratingData.totalRatings || 0);
            }
        } catch { /* silent */ }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !user?.idToken || isPosting) return;
        setIsPosting(true);
        try {
            await postComment({
                idToken:         user.idToken,
                commentParentId: null,
                productId,
                userDisplayName: user.name || user.email || null,
                phoneNo:         phoneNo || null,
                comments:        newComment,
            });
            setNewComment('');
            await loadFeedbackAndRating();
        } catch { /* silent */ }
        finally { setIsPosting(false); }
    };

    const handlePostReply = async (parentId) => {
        if (!replyText.trim() || !user?.idToken || isPosting) return;
        setIsPosting(true);
        try {
            await postComment({
                idToken:         user.idToken,
                commentParentId: parentId,
                productId,
                userDisplayName: user.name || user.email || null,
                phoneNo:         phoneNo || null,
                comments:        replyText,
            });
            setReplyText('');
            setReplyTo(null);
            await loadFeedbackAndRating();
        } catch { /* silent */ }
        finally { setIsPosting(false); }
    };

    const handleInteract = async (commentId, action) => {
        if (!user?.idToken) return; // must be authenticated to like/dislike
        try {
            await interactComment(user.idToken, commentId, action);
            loadFeedbackAndRating();
        } catch { /* silent */ }
    };

    // Organize feedback into threads.
    // Cast both sides to Number — D1 returns integers, but JSON parsing can
    // occasionally produce strings depending on the serialization path.
    const topLevelComments = feedback.filter(f => !f.CommentParentID);
    const getReplies = (parentId) =>
        feedback.filter(f => f.CommentParentID && Number(f.CommentParentID) === Number(parentId));

    return (
        <div className="mt-16 border-t pt-12 border-gray-200 dark:border-gray-800">
            <h2 className="text-3xl font-heading font-bold mb-8 flex items-center gap-3">
                <MessageSquare size={28} className="text-primary" />
                Customer Reviews & Feedback
            </h2>

            {/* Rating Summary */}
            <div className="flex items-center gap-6 mb-10 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <div className="text-center">
                    <div className="text-5xl font-bold font-heading">{averageRating ? Number(averageRating).toFixed(1) : '0.0'}</div>
                    <div className="flex items-center justify-center mt-2 text-primary">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} size={18} fill={star <= Math.round(averageRating) ? "currentColor" : "none"} />
                        ))}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{totalRatings || 0} Ratings</div>
                </div>
                <div className="flex-1 border-l pl-6 border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold mb-2">Rate this product</h3>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => handleRating(star)}
                                className={`p-2 rounded-full transition-all hover:scale-110 ${rating >= star ? 'text-primary fill-primary' : 'text-gray-300'}`}
                            >
                                <Star size={28} fill={rating >= star ? "currentColor" : "none"} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Comment Form */}
            <div className="mb-10 space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h3 className="font-bold text-lg mb-2">Leave a Review</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" 
                        placeholder="Your Name (required)" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)} 
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                        type="tel" 
                        placeholder="Your Phone Number (optional)" 
                        value={phoneNo} 
                        onChange={(e) => setPhoneNo(e.target.value)} 
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <textarea
                    placeholder="What did you think about this product?"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="3"
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <div className="flex justify-end">
                    <button 
                        onClick={handlePostComment}
                        disabled={!newComment.trim() || !userName.trim() || isPosting}
                        className="bg-black dark:bg-white text-white dark:text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isPosting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Send size={18} />}
                        {isPosting ? 'Posting...' : 'Post Review'}
                    </button>
                </div>
            </div>

            {/* Comments List */}
            {loading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div></div>
            ) : topLevelComments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 font-medium">No reviews yet. Be the first to share your thoughts!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {topLevelComments.map(comment => (
                        <div key={comment.CommentID} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold">{maskUserId(comment.UserId)}</h4>
                                    <span className="text-xs text-gray-400">{comment.Timestamp}</span>
                                </div>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">{comment.Comments}</p>
                            
                            <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                                <button onClick={() => handleInteract(comment.CommentID, 'like')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                    <ThumbsUp size={16} /> {comment.Like || 0}
                                </button>
                                <button onClick={() => handleInteract(comment.CommentID, 'dislike')} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                                    <ThumbsDown size={16} /> {comment.Dislike || 0}
                                </button>
                                <button onClick={() => setReplyTo(replyTo === comment.CommentID ? null : comment.CommentID)} className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors ml-4">
                                    <Reply size={16} /> Reply
                                </button>
                            </div>

                            {/* Reply Input — shown only for this specific comment */}
                            {replyTo === comment.CommentID && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-xs text-gray-400 font-medium">
                                        Replying to <span className="text-primary font-semibold">{maskUserId(comment.UserId)}</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Write a reply..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostReply(comment.CommentID)}
                                            autoFocus
                                            className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        />
                                        <button
                                            onClick={() => handlePostReply(comment.CommentID)}
                                            disabled={!replyText.trim() || isPosting}
                                            className="bg-primary text-black font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isPosting ? 'Posting...' : 'Reply'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Nested Replies */}
                            {getReplies(comment.CommentID).length > 0 && (
                                <div className="mt-4 pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-4">
                                    {getReplies(comment.CommentID).map(reply => (
                                        <div key={reply.CommentID} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-bold text-sm">{maskUserId(reply.UserId)}</span>
                                                    <span className="text-xs text-gray-400 ml-2">{reply.Timestamp}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{reply.Comments}</p>
                                            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                                <button onClick={() => handleInteract(reply.CommentID, 'like')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                                    <ThumbsUp size={14} /> {reply.Like || 0}
                                                </button>
                                                <button onClick={() => handleInteract(reply.CommentID, 'dislike')} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                                                    <ThumbsDown size={14} /> {reply.Dislike || 0}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeedbackSection;

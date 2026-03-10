useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get('/messages');
        
        // FIX 1: Defensive check for the array
        const msgs: Message[] = Array.isArray(response.data) ? response.data : [];
        
        if (msgs.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const groups: { [key: string]: Conversation } = {};
        
        // FIX 2: Safe forEach
        msgs.forEach(msg => {
          // UUIDs are strings, so this comparison is now safe
          const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
          const otherUserName = msg.sender_id === user?.id ? msg.receiver_name : msg.sender_name;
          const key = `${msg.listing_id}-${otherUserId}`;
          
          if (!groups[key]) {
            groups[key] = {
              listing_id: msg.listing_id,
              listing_title: msg.listing_title,
              other_user_id: otherUserId,
              other_user_name: otherUserName || 'Unknown User',
              last_message: msg.content,
              last_time: msg.created_at,
              messages: []
            };
          }
          groups[key].messages.push(msg);
        });

        // Sort and Set state
        const sortedConvs = Object.values(groups).map(group => {
          group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const last = group.messages[group.messages.length - 1];
          return {
            ...group,
            last_message: last.content,
            last_time: last.created_at
          };
        }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

        setConversations(sortedConvs);
        
        if (sortedConvs.length > 0 && !selectedConv) {
          setSelectedConv(sortedConvs[0]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setConversations([]); // Prevent crash
        announce('Failed to load messages.', 'assertive');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [user?.id]);
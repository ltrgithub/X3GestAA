using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Popups;

/// <summary>
/// 
/// </summary>
namespace SageX3WUP.App
{

    /// <summary>
    /// 
    /// </summary>
    public class UIHelpers
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="message"></param>
        /// <param name="title"></param>
        /// <param name="commands"></param>
        /// <param name="defIdx"></param>
        /// <param name="cancelIdx"></param>
        /// <returns></returns>
        public static Task<int> ShowModal(string message, string title = null, string[] commands = null, uint defIdx = 0, uint cancelIdx = 1)
        {
            MessageDialog messageDialog = new MessageDialog(message, title != null ? title : "");
            if (commands == null)
            {
                commands = new string[] { "Ok" };
            }

            List<IUICommand> cmds = new List<IUICommand>();
            UICommand cmd;
            foreach (string command in commands) {
                cmd = new UICommand(command);
                cmds.Add(cmd);
                messageDialog.Commands.Add(cmd);
            }
            messageDialog.DefaultCommandIndex = defIdx;
            messageDialog.CancelCommandIndex = cancelIdx;

            return messageDialog.ShowAsync().AsTask().ContinueWith(rcmd => { return cmds.IndexOf(rcmd.Result); });
        }
    }
}

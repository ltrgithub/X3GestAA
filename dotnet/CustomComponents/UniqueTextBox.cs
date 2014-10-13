using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Drawing;
using System.Windows.Forms.VisualStyles;
using System.Runtime.InteropServices;

namespace CustomComponents
{
    public class UniqueTextBox : TextBox
    {
        [DllImport("user32")]
        private static extern IntPtr GetWindowDC(IntPtr hwnd);
        struct RECT
        {
          public int left, top, right, bottom;
        }
        struct NCCALSIZE_PARAMS
        {
          public RECT newWindow;
          public RECT oldWindow;
          public RECT clientWindow;
          IntPtr windowPos;
        }            
        int clientPadding = 0;
        int actualBorderWidth = 1;
        Color borderColor = SystemColors.ActiveBorder; // Color.Red;  
    
        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);

          //We have to change the clientsize to make room for borders
          //if not, the border is limited in how thick it is.
          if (m.Msg == 0x83) //WM_NCCALCSIZE   
          {
            if (m.WParam == IntPtr.Zero)
            {
                RECT rect = (RECT)Marshal.PtrToStructure(m.LParam, typeof(RECT));
                rect.left += clientPadding;
                rect.right -= clientPadding;
                rect.top += clientPadding;
                rect.bottom -= clientPadding;
                Marshal.StructureToPtr(rect, m.LParam, false);
            }
            else
            {
                NCCALSIZE_PARAMS rects = (NCCALSIZE_PARAMS)Marshal.PtrToStructure(m.LParam, typeof(NCCALSIZE_PARAMS));
                rects.newWindow.left += clientPadding;
                rects.newWindow.right -= clientPadding;
                rects.newWindow.top += clientPadding;
                rects.newWindow.bottom -= clientPadding;
                Marshal.StructureToPtr(rects, m.LParam, false);
            }
          }
          if (m.Msg == 0x85 || _forcePaint) // WM_NCPAINT 
          {
             _forcePaint = false;
             IntPtr wDC = GetWindowDC(Handle);
             using(Graphics g = Graphics.FromHdc(wDC))
             {
                 ControlPaint.DrawBorder(g, new Rectangle(0, 0, Size.Width, Size.Height), borderColor, actualBorderWidth, ButtonBorderStyle.Solid,
                     borderColor, actualBorderWidth, ButtonBorderStyle.Solid, borderColor, actualBorderWidth, ButtonBorderStyle.Solid,
                     borderColor, actualBorderWidth, ButtonBorderStyle.Solid); 
             }
             return;
          }
        }

        private Boolean _showError = false;
        private Boolean _forcePaint = false;
        public Boolean ShowError
        {
            get { return _showError; }
            set 
            { 
                _showError = value;

                borderColor = _showError ? Color.Red : SystemColors.ActiveBorder;

                //if (_showError)
                //    borderColor = Color.Red;
                //else
                //    borderColor = SystemColors.ActiveBorder;

                _forcePaint = true;
            }
        }
    }
}

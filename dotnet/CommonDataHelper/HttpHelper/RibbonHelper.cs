using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using CommonDataHelper;


namespace CommonDataHelper.HttpHelper
{
    public class RibbonHelper
    {
        private static Microsoft.Office.Tools.Ribbon.RibbonButton _button;

        public static Microsoft.Office.Tools.Ribbon.RibbonButton ButtonDisconnect
        {
            get { return _button; }
            set { _button = value; }
        }

        public static void toggleButtonDisconnect()
        {
            if (_button == null) return;

            if (CookieHelper.CookieContainer == null)
            {
                _button.Enabled = false;
            }
            else
            {
                _button.Enabled = false;
                foreach (Cookie cookie in CookieHelper.CookieContainer.GetCookies(BaseUrlHelper.BaseUrl))
                {
                    _button.Enabled = true;
                    break;
                }
            }
        }

        public static void toggleButtonDisable()
        {
            if (_button != null)
                _button.Enabled = false;
        }
    }
}

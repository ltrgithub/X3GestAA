using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.OwnerHelper
{
    public class OwnerItem
    {
        private string _login;
        private string _uuid;

        public OwnerItem(string login, string uuid)
        {
            _login = login;
            _uuid = uuid;
        }

        public string Login
        {
            get { return _login; }
        }

        public string Uuid
        {
            get { return _uuid; }
        }
    }
}

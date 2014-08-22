using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.ActivityCodeHelper
{
    public class ActivityCodeItem
    {
        private string _description;
        private string _uuid;

        public ActivityCodeItem(string description, string uuid)
        {
            _description = description;
            _uuid = uuid;
        }

        public string Description
        {
            get { return _description; }
        }

        public string Uuid
        {
            get { return _uuid; }
        }
    }
}
